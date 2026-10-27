import {
  ChangeDetectionStrategy,
  Component,
  Injector,
  OnDestroy,
  OnInit,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { finalize } from 'rxjs';
import { ControlCenterService } from '../../core/services/control-center.service';
import { FlowSseService } from '../../core/services/flow-sse.service';
import { NotificationService } from '../../core/services/notification.service';
import {
  InterventionResponse,
  ProcessExecutionResponse,
  ProcessExecutionStepResponse,
} from '../../core/interfaces/process.models';
import { UserFacingError } from '../../core/models/api-error.model';
import { toUserFacingError } from '../../core/interceptors/http-error.interceptor';
import { StatusBadgeComponent } from '../status-badge/status-badge.component';
import { StepTimelineComponent } from '../step-timeline/step-timeline.component';
import { EventLogComponent } from '../event-log/event-log.component';
import { IconComponent } from '../../shared/icon/icon.component';
import { ErrorBannerComponent } from '../../shared/error-banner/error-banner.component';

const REFRESH_EVENTS = new Set([
  'STEP_COMPLETED',
  'STEP_FAILED',
  'FLOW_COMPLETED',
  'FLOW_FAILED',
  'FLOW_RESUMED',
  'FLOW_PAUSED',
]);

@Component({
  selector: 'app-process-progress-dialog',
  standalone: true,
  imports: [
    CommonModule,
    StatusBadgeComponent,
    StepTimelineComponent,
    EventLogComponent,
    IconComponent,
    ErrorBannerComponent,
  ],
  templateUrl: './process-progress-dialog.component.html',
  styleUrls: ['./process-progress-dialog.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProcessProgressDialogComponent implements OnInit, OnDestroy {
  private readonly controlCenter = inject(ControlCenterService);
  private readonly notifications = inject(NotificationService);
  private readonly injector = inject(Injector);

  readonly processId = input.required<string>();
  readonly closed = output<void>();

  protected readonly sse = inject(FlowSseService);
  protected readonly process = signal<ProcessExecutionResponse | null>(null);
  protected readonly stepResponses = signal<ProcessExecutionStepResponse[]>([]);
  protected readonly error = signal<UserFacingError | null>(null);
  protected readonly loading = signal(false);
  protected readonly resuming = signal(false);
  protected readonly retrying = signal(false);
  protected readonly pendingIntervention = signal<InterventionResponse | null>(null);

  protected readonly completedSteps = computed(
    () => this.stepResponses().filter((step) => step.status?.toUpperCase() === 'COMPLETED').length,
  );
  protected readonly totalSteps = computed(() => this.stepResponses().length);
  protected readonly allCompleted = computed(
    () => this.totalSteps() > 0 && this.completedSteps() === this.totalSteps(),
  );
  protected readonly hasFailed = computed(() =>
    this.stepResponses().some(
      (step) => step.status?.toUpperCase() === 'FAILED' || step.status?.toUpperCase() === 'ERROR',
    ),
  );
  protected readonly progressLabel = computed(() => {
    if (this.hasFailed()) return 'Falló el proceso';
    if (this.allCompleted()) return '¡Proceso completado!';
    return `${this.completedSteps()} de ${this.totalSteps()} pasos completados`;
  });
  protected readonly isInProgress = computed(() => {
    const status = this.process()?.status?.toUpperCase();
    return status === 'IN_PROGRESS' || status === 'RUNNING';
  });
  protected readonly isPaused = computed(() => this.process()?.status?.toUpperCase() === 'PAUSED_FOR_HUMAN');

  ngOnInit(): void {
    this.loadDashboard();
    this.sse.clear();
    this.sse.connect(this.processId());

    effect(
      () => {
        const events = this.sse.flowEvents();
        const latest = events[events.length - 1];
        if (!latest) return;

        if (latest.eventType === 'STEP_REQUIRES_INTERVENTION') {
          this.loadPendingIntervention();
        }
        if (REFRESH_EVENTS.has(latest.eventType)) {
          this.loadDashboard();
        }
      },
      { injector: this.injector },
    );
  }

  ngOnDestroy(): void {
    this.sse.disconnect();
  }

  protected retryLoad(): void {
    this.loadDashboard();
  }

  private loadDashboard(): void {
    this.error.set(null);
    this.loadProcess();
    this.loadSteps();
  }

  private loadProcess(): void {
    this.controlCenter.getProcess(this.processId(), true).subscribe({
      next: (data) => {
        this.process.set(data);
        if (data.status?.toUpperCase() === 'PAUSED_FOR_HUMAN') {
          this.loadPendingIntervention();
        } else {
          this.pendingIntervention.set(null);
        }
      },
      error: (error) => this.error.set(toUserFacingError(error)),
    });
  }

  private loadSteps(): void {
    this.loading.set(true);
    this.controlCenter
      .getProcessSteps(this.processId(), true)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (data) => {
          this.stepResponses.set(data);
        },
        error: (error) => this.error.set(toUserFacingError(error)),
      });
  }

  private loadPendingIntervention(): void {
    // El backend falla al filtrar por status, así que se consulta el listado
    // completo y se filtra en cliente.
    this.controlCenter.listInterventions(undefined, true).subscribe({
      next: (interventions) => {
        const match = interventions.find(
          (intervention) =>
            intervention.status === 'PENDING' && intervention.processId === this.processId(),
        );
        this.pendingIntervention.set(match ?? null);
      },
      error: (error) => this.error.set(toUserFacingError(error)),
    });
  }

  protected onClose(): void {
    this.sse.disconnect();
    this.closed.emit();
  }

  protected onResume(): void {
    const intervention = this.pendingIntervention();
    if (!intervention || this.resuming()) return;

    this.resuming.set(true);
    this.controlCenter
      .resumeIntervention(intervention.id)
      .pipe(finalize(() => this.resuming.set(false)))
      .subscribe({
        next: () => {
          this.pendingIntervention.set(null);
          this.notifications.success('El proceso se reanudó y continúa ejecutándose.');
          this.loadDashboard();
        },
        error: () => {
          // El interceptor muestra el mensaje amigable; el botón queda disponible para reintentar.
        },
      });
  }

  protected onRetryProcess(): void {
    if (this.retrying()) return;

    this.retrying.set(true);
    this.controlCenter
      .retryProcess(this.processId())
      .pipe(finalize(() => this.retrying.set(false)))
      .subscribe({
        next: () => {
          this.notifications.success('Reintentamos el proceso. Estamos actualizando el progreso.');
          this.loadDashboard();
        },
        error: () => {
          // El interceptor muestra el mensaje amigable; el botón queda disponible para reintentar.
        },
      });
  }
}
