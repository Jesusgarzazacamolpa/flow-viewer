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
import {
  ProcessProgressTone,
  isProcessFailed,
  isProcessInProgress,
  isProcessPaused,
  normalizeProcessStatus,
  progressToneClass,
  resolveProgressLabel,
  resolveProgressTone,
} from '../../core/models/process-status.model';
import { toUserFacingError } from '../../core/interceptors/http-error.interceptor';
import { StatusBadgeComponent } from '../status-badge/status-badge.component';
import { StepTimelineComponent } from '../step-timeline/step-timeline.component';
import { EventLogComponent } from '../event-log/event-log.component';
import { ProcessCancelledPanelComponent } from '../process-cancelled-panel/process-cancelled-panel.component';
import { ProcessErrorPanelComponent } from '../process-error-panel/process-error-panel.component';
import { ProcessInterventionPanelComponent } from '../process-intervention-panel/process-intervention-panel.component';
import { ProcessPausedPanelComponent } from '../process-paused-panel/process-paused-panel.component';
import { IconComponent } from '../../shared/icon/icon.component';
import { ErrorBannerComponent } from '../../shared/error-banner/error-banner.component';

/** Eventos SSE que obligan a recargar el proceso y sus pasos para reflejar el avance. */
const REFRESH_EVENTS = new Set([
  'STEP_COMPLETED',
  'STEP_FAILED',
  'STEP_REQUIRES_INTERVENTION',
  'FLOW_COMPLETED',
  'FLOW_FAILED',
  'FLOW_RESUMED',
  'FLOW_PAUSED',
  'FLOW_CANCELLED',
]);

/**
 * Selector `app-process-progress-dialog`. Diálogo con el avance en vivo de un proceso vía SSE que
 * permite reanudar o rechazar intervenciones y reintentar; usa `ControlCenterService`,
 * `FlowSseService` y `NotificationService`, y emite `closed` al cerrarse.
 */
@Component({
  selector: 'app-process-progress-dialog',
  standalone: true,
  imports: [
    CommonModule,
    StatusBadgeComponent,
    StepTimelineComponent,
    EventLogComponent,
    ProcessErrorPanelComponent,
    ProcessCancelledPanelComponent,
    ProcessInterventionPanelComponent,
    ProcessPausedPanelComponent,
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

  /** Id del proceso cuyo progreso se muestra. */
  readonly processId = input.required<string>();
  /** Nombre del cliente para el encabezado, si se conoce. */
  readonly customerName = input<string | null>(null);
  /** Nombre de la plantilla o flujo para el encabezado, si se conoce. */
  readonly templateName = input<string | null>(null);
  /** Se emite cuando el usuario cierra el diálogo. */
  readonly closed = output<void>();

  /** Servicio SSE expuesto a la plantilla para mostrar el estado de la conexión. */
  protected readonly sse = inject(FlowSseService);
  /** Datos del proceso cargados desde el control center. */
  protected readonly process = signal<ProcessExecutionResponse | null>(null);
  /** Pasos del proceso en orden de ejecución. */
  protected readonly stepResponses = signal<ProcessExecutionStepResponse[]>([]);
  /** Error amigable de la última carga o acción. */
  protected readonly error = signal<UserFacingError | null>(null);
  /** Indica si los pasos se están cargando. */
  protected readonly loading = signal(false);
  /** Indica si hay una reanudación de intervención en curso. */
  protected readonly resuming = signal(false);
  /** Indica si hay un rechazo de intervención en curso. */
  protected readonly rejecting = signal(false);
  /** Indica si hay un reintento del proceso en curso. */
  protected readonly retrying = signal(false);
  /** Intervención pendiente de revisión asociada al proceso, si existe. */
  protected readonly pendingIntervention = signal<InterventionResponse | null>(null);
  /** Indica que se está consultando si hay una intervención pendiente. */
  protected readonly checkingIntervention = signal(false);

  /** Pasos completados del proceso. */
  protected readonly completedSteps = computed(
    () => this.stepResponses().filter((step) => step.status?.toUpperCase() === 'COMPLETED').length,
  );
  /** Total de pasos cargados. */
  protected readonly totalSteps = computed(() => this.stepResponses().length);
  /** Estado normalizado del proceso. */
  protected readonly status = computed(() => normalizeProcessStatus(this.process()?.status));
  /** Texto de avance que combina estado y número de pasos. */
  protected readonly progressLabel = computed(() =>
    resolveProgressLabel(this.status(), this.completedSteps(), this.totalSteps()),
  );
  /** Tono visual asociado al estado del proceso. */
  protected readonly progressTone = computed(() => resolveProgressTone(this.status()));
  /** Indica si el proceso sigue en ejecución. */
  protected readonly isInProgress = computed(() => isProcessInProgress(this.status()));
  /** Indica si el proceso está pausado esperando intervención. */
  protected readonly isPaused = computed(() => isProcessPaused(this.status()));
  /** Muestra el panel de error cuando el proceso falló. */
  protected readonly showErrorPanel = computed(() => isProcessFailed(this.status()));
  /** Muestra el panel de cancelación cuando el proceso está cancelado. */
  protected readonly showCancelledPanel = computed(() => this.status() === 'CANCELLED');
  /** Pausa sin intervención: caso en el que solo cabe reanudar directamente. */
  protected readonly pausedWithoutIntervention = computed(
    () => this.isPaused() && !this.checkingIntervention() && this.pendingIntervention() === null,
  );
  /** Nombre del paso en ejecución o, en su defecto, el paso actual informado por el proceso. */
  protected readonly runningStep = computed(() => {
    const running = this.stepResponses().find((step) => {
      const status = step.status?.toUpperCase();
      return status === 'RUNNING' || status === 'IN_PROGRESS';
    });
    return running?.name ?? this.process()?.currentStep ?? null;
  });

  ngOnInit(): void {
    this.loadDashboard();
    this.sse.clear();
    this.sse.connect(this.processId());

    effect(
      () => {
        const events = this.sse.flowEvents();
        const latest = events[events.length - 1];
        if (!latest) return;

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

  /** Traduce el tono de progreso a la clase de color correspondiente. */
  protected toneClass(tone: ProcessProgressTone): string {
    return progressToneClass(tone);
  }

  /** Reintenta la carga completa del diálogo desde el banner de error. */
  protected retryLoad(): void {
    this.loadDashboard();
  }

  /** Carga proceso y pasos y limpia el error anterior. */
  private loadDashboard(): void {
    this.error.set(null);
    this.loadProcess();
    this.loadSteps();
  }

  /** Carga el proceso y, si está pausado, consulta su intervención pendiente. */
  private loadProcess(): void {
    this.controlCenter.getProcess(this.processId(), true).subscribe({
      next: (data) => {
        this.process.set(data);
        if (isProcessPaused(data.status)) {
          this.loadPendingIntervention();
        } else {
          this.pendingIntervention.set(null);
          this.checkingIntervention.set(false);
        }
      },
      error: (error) => this.error.set(toUserFacingError(error)),
    });
  }

  /** Carga los pasos del proceso y controla el indicador de carga. */
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

  /** Busca la primera intervención PENDING_REVIEW del proceso. */
  private loadPendingIntervention(): void {
    this.checkingIntervention.set(true);
    this.controlCenter
      .listInterventions({ processId: this.processId(), status: 'PENDING_REVIEW' }, true)
      .subscribe({
        next: (interventions) => {
          this.pendingIntervention.set(interventions[0] ?? null);
          this.checkingIntervention.set(false);
        },
        error: (error) => {
          this.checkingIntervention.set(false);
          this.error.set(toUserFacingError(error));
        },
      });
  }

  /** Desconecta el SSE y notifica al padre que el diálogo debe cerrarse. */
  protected onClose(): void {
    this.sse.disconnect();
    this.closed.emit();
  }

  /** Aprueba la intervención pendiente para que el proceso continúe. */
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

  /** Rechaza la intervención tras confirmación; el proceso queda cancelado. */
  protected onReject(): void {
    const intervention = this.pendingIntervention();
    if (!intervention || this.rejecting()) return;

    const confirmed = window.confirm(
      '¿Rechazar la intervención? El proceso se cancelará y no podrá reanudarse.',
    );
    if (!confirmed) return;

    this.rejecting.set(true);
    this.controlCenter
      .rejectIntervention(intervention.id)
      .pipe(finalize(() => this.rejecting.set(false)))
      .subscribe({
        next: () => {
          this.pendingIntervention.set(null);
          this.notifications.success('La intervención se rechazó y el proceso quedó cancelado.');
          this.loadDashboard();
        },
        error: () => {
          // El interceptor muestra el mensaje amigable; el botón queda disponible para reintentar.
        },
      });
  }

  /** Reintenta el proceso completo desde el panel de error. */
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
