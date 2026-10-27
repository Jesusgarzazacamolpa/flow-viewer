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
import { toUserFacingError } from '../../core/interceptors/http-error.interceptor';
import { StatusBadgeComponent } from '../status-badge/status-badge.component';
import { StepTimelineComponent } from '../step-timeline/step-timeline.component';
import { IconComponent } from '../../shared/icon/icon.component';
import { ErrorBannerComponent } from '../../shared/error-banner/error-banner.component';

@Component({
  selector: 'app-flow-tracker',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    StatusBadgeComponent,
    StepTimelineComponent,
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

  protected processId = '';
  protected readonly process = signal<ProcessExecutionResponse | null>(null);
  protected readonly stepResponses = signal<ProcessExecutionStepResponse[]>([]);
  protected readonly error = signal<UserFacingError | null>(null);
  protected readonly loading = signal(false);
  protected readonly actionPending = signal(false);

  protected readonly showUserInput = signal(false);
  protected readonly userInputControl = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.maxLength(2000)],
  });

  protected readonly userInputValid = toSignal(
    this.userInputControl.statusChanges.pipe(startWith(this.userInputControl.status)),
    { initialValue: this.userInputControl.status },
  );

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
  protected readonly isFailed = computed(() => {
    const status = this.process()?.status?.toUpperCase();
    return status === 'FAILED' || status === 'ERROR';
  });
  protected readonly isPaused = computed(() => this.process()?.status?.toUpperCase() === 'PAUSED_FOR_HUMAN');

  ngOnInit(): void {
    this.processId = this.route.snapshot.paramMap.get('id') ?? '';
    if (this.processId) {
      this.refreshProcess();
    }
  }

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

  protected goBack(): void {
    this.router.navigate(['']);
  }

  protected retryProcess(): void {
    if (!this.processId || this.actionPending()) return;

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
          // El interceptor central muestra el mensaje amigable; el botón sigue disponible para reintentar.
        },
      });
  }

  protected retryStep(stepOrder: number): void {
    if (!this.processId || this.actionPending()) return;

    this.actionPending.set(true);
    this.controlCenter
      .retryStep(this.processId, stepOrder)
      .pipe(finalize(() => this.actionPending.set(false)), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.notifications.success('Reintentamos el paso. Estamos actualizando el progreso.');
          this.refreshProcess();
        },
        error: () => {
          // El interceptor central muestra el mensaje amigable.
        },
      });
  }

  protected submitUserInput(): void {
    this.userInputControl.markAsTouched();
    if (this.userInputControl.invalid) return;
    this.retryProcess();
  }
}
