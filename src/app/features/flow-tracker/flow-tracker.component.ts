import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { DestroyRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize, startWith } from 'rxjs';
import { ControlCenterService } from '../../core/services/control-center.service';
import { NotificationService } from '../../core/services/notification.service';
import { ProcessExecutionResponse, ProcessExecutionStepResponse } from '../../core/interfaces/process.models';
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
import { ProcessErrorPanelComponent } from '../process-error-panel/process-error-panel.component';
import { IconComponent } from '../../shared/icon/icon.component';
import { ErrorBannerComponent } from '../../shared/error-banner/error-banner.component';

/**
 * Selector `app-flow-tracker`. Vista de seguimiento de un proceso por el id de la ruta, con pasos,
 * estado y reintentos; usa `ControlCenterService` y `NotificationService`. No está enrutado ni se usa.
 */
@Component({
  selector: 'app-flow-tracker',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    StatusBadgeComponent,
    StepTimelineComponent,
    ProcessErrorPanelComponent,
    IconComponent,
    ErrorBannerComponent,
  ],
  templateUrl: './flow-tracker.component.html',
  styleUrls: ['./flow-tracker.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FlowTrackerComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly controlCenter = inject(ControlCenterService);
  private readonly notifications = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  /** Id del proceso tomado de los parámetros de la ruta. */
  protected processId = '';
  /** Datos del proceso cargado. */
  protected readonly process = signal<ProcessExecutionResponse | null>(null);
  /** Pasos del proceso en orden de ejecución. */
  protected readonly stepResponses = signal<ProcessExecutionStepResponse[]>([]);
  /** Error amigable de la última carga o acción. */
  protected readonly error = signal<UserFacingError | null>(null);
  /** Indica si los pasos se están cargando. */
  protected readonly loading = signal(false);
  /** Indica si hay un reintento en curso para deshabilitar acciones. */
  protected readonly actionPending = signal(false);

  /** Muestra el campo de texto para indicar el motivo del reintento. */
  protected readonly showUserInput = signal(false);
  /** Texto libre con el motivo o contexto del reintento. */
  protected readonly userInputControl = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.maxLength(2000)],
  });

  /** Estado de validez del campo de texto, expuesto como signal para la plantilla. */
  protected readonly userInputValid = toSignal(
    this.userInputControl.statusChanges.pipe(startWith(this.userInputControl.status)),
    { initialValue: this.userInputControl.status },
  );

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
  /** Indica si el proceso falló. */
  protected readonly isFailed = computed(() => isProcessFailed(this.status()));
  /** Indica si el proceso está pausado esperando intervención. */
  protected readonly isPaused = computed(() => isProcessPaused(this.status()));
  /** Permite reintentar el proceso cuando falló o quedó pausado. */
  protected readonly canRetryProcess = computed(() => this.isFailed() || this.isPaused());

  /** Traduce el tono de progreso a la clase de color correspondiente. */
  protected toneClass(tone: ProcessProgressTone): string {
    return progressToneClass(tone);
  }

  ngOnInit(): void {
    this.processId = this.route.snapshot.paramMap.get('id') ?? '';
    if (this.processId) {
      this.refreshProcess();
    }
  }

  /** Recarga el proceso y sus pasos; ambos alimentan las señales de la vista. */
  protected refreshProcess(): void {
    if (!this.processId) return;

    this.loading.set(true);
    this.error.set(null);

    this.controlCenter.getProcess(this.processId, true).subscribe({
      next: (data) => this.process.set(data),
      error: (error) => this.error.set(toUserFacingError(error)),
    });

    this.controlCenter
      .getProcessSteps(this.processId, true)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (steps) => this.stepResponses.set(steps),
        error: (error) => this.error.set(toUserFacingError(error)),
      });
  }

  /** Vuelve a la ruta raíz (dashboard). */
  protected goBack(): void {
    this.router.navigate(['']);
  }

  /** Reintenta el proceso completo con un motivo opcional y recarga el progreso. */
  protected retryProcess(): void {
    if (!this.processId || this.actionPending() || !this.canRetryProcess()) return;

    this.actionPending.set(true);
    this.controlCenter
      .retryProcess(this.processId, this.userInputControl.value.trim() || undefined)
      .pipe(finalize(() => this.actionPending.set(false)), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.userInputControl.reset('');
          this.showUserInput.set(false);
          this.notifications.success('Reintentamos el proceso. Estamos actualizando el progreso.');
          this.refreshProcess();
        },
        error: () => {
          // El interceptor central muestra el mensaje amigable.
          this.refreshProcess();
        },
      });
  }

  /** Reintenta un paso concreto por su orden y refresca el proceso. */
  protected retryStep(stepOrder: number): void {
    if (!this.processId || this.actionPending() || !this.canRetryProcess()) return;

    this.actionPending.set(true);
    this.controlCenter
      .retryStep(this.processId, stepOrder)
      .pipe(finalize(() => this.actionPending.set(false)), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.notifications.success('Reintentamos el paso y reanudamos el proceso.');
          this.refreshProcess();
        },
        error: () => {
          // El interceptor central muestra el mensaje amigable.
          this.refreshProcess();
        },
      });
  }

  /** Valida el motivo escrito y delega en `retryProcess`. */
  protected submitUserInput(): void {
    this.userInputControl.markAsTouched();
    if (this.userInputControl.invalid) return;
    this.retryProcess();
  }
}
