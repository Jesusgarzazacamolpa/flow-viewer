import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { HumanInterventionService } from '../../core/services/human-intervention.service';
import { NotificationService } from '../../core/services/notification.service';
import { HumanIntervention } from '../../core/interfaces/intervention.interface';
import { UserFacingError } from '../../core/models/api-error.model';
import { toUserFacingError } from '../../core/interceptors/http-error.interceptor';
import { ErrorBannerComponent } from '../../shared/error-banner/error-banner.component';

type InterventionAction = 'RESUME' | 'CANCEL';

@Component({
  selector: 'app-human-intervention',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ErrorBannerComponent],
  template: `
<div class="space-y-6">
  <header>
    <h1 class="text-2xl font-bold text-slate-900 dark:text-slate-100">Intervención Humana</h1>
    <p class="text-sm text-slate-500 dark:text-slate-400">Pasos que requieren atención manual.</p>
  </header>

  @if (loadError(); as error) {
    <app-error-banner
      title="No pudimos cargar las intervenciones"
      [message]="error.message"
      [reference]="error.reference"
      (retry)="refresh()"
    />
  }

  <section class="rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-4">
    <div class="mb-3 flex items-center justify-between">
      <h2 class="text-sm font-medium text-slate-700 dark:text-slate-300">Intervenciones pendientes</h2>
      <button
        type="button"
        (click)="refresh()"
        [disabled]="loading()"
        class="text-xs text-slate-500 dark:text-slate-500 underline hover:text-slate-700 disabled:opacity-50 dark:hover:text-slate-300"
      >
        {{ loading() ? 'Cargando…' : 'Recargar' }}
      </button>
    </div>

    <div class="overflow-x-auto">
      <table class="w-full border-collapse text-sm">
        <thead>
          <tr class="border-b border-slate-300 dark:border-slate-800 text-left">
            <th class="pb-2 text-xs font-medium uppercase text-slate-500 dark:text-slate-500">Proceso</th>
            <th class="pb-2 text-xs font-medium uppercase text-slate-500 dark:text-slate-500">Paso</th>
            <th class="pb-2 text-xs font-medium uppercase text-slate-500 dark:text-slate-500">Error</th>
            <th class="pb-2 text-xs font-medium uppercase text-slate-500 dark:text-slate-500">Estado</th>
            <th class="pb-2 text-xs font-medium uppercase text-slate-500 dark:text-slate-500">Asignado a</th>
            <th class="pb-2 text-xs font-medium uppercase text-slate-500 dark:text-slate-500">Creado</th>
            <th class="pb-2 text-xs font-medium uppercase text-slate-500 dark:text-slate-500">Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr
            *ngFor="let item of interventions(); trackBy: trackById"
            class="border-b border-slate-200/50 dark:border-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800/30"
          >
            <td class="py-2 font-mono text-xs text-slate-600 dark:text-slate-400">{{ item.processId }}</td>
            <td class="py-2 text-slate-800 dark:text-slate-300">{{ item.stepName }} (orden {{ item.stepOrder }})</td>
            <td class="py-2 text-sm text-slate-700 dark:text-slate-300">{{ item.errorMessage }}</td>
            <td class="py-2">
              <span
                class="inline-block rounded px-2 py-0.5 text-xs font-medium"
                [ngClass]="statusBadgeClass(item.status)"
              >
                {{ item.status }}
              </span>
            </td>
            <td class="py-2 text-slate-700 dark:text-slate-300">
              {{ item.assignedTo || '——' }}
            </td>
            <td class="py-2 text-slate-600 dark:text-slate-500">{{ item.createdAt | date:'shortTime' }}</td>
            <td class="py-2">
              <div class="flex items-center gap-2">
                @if (!item.assignedTo) {
                  <input
                    type="text"
                    placeholder="Asignar a..."
                    [formControl]="assigneeControlFor(item.id)"
                    [attr.aria-label]="'Asignar la intervención del paso ' + item.stepName"
                    class="w-32 rounded-md border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2 py-1 text-xs text-slate-800 dark:text-slate-200"
                  />
                  <button
                    type="button"
                    (click)="assign(item)"
                    [disabled]="assigneeControlFor(item.id).invalid || assigningId() === item.id"
                    class="rounded-md bg-sky-600 px-2 py-1 text-xs font-medium text-white hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {{ assigningId() === item.id ? 'Asignando…' : 'Asignar' }}
                  </button>
                } @else {
                  <select
                    (change)="onActionSelect($event, item)"
                    [disabled]="actingId() === item.id"
                    [attr.aria-label]="'Acciones para la intervención del paso ' + item.stepName"
                    class="rounded-md border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2 py-1 text-xs text-slate-800 dark:text-slate-200 disabled:opacity-60"
                  >
                    <option value=""> — Acciones — </option>
                    <option value="RESUME">Continuar proceso</option>
                    <option value="CANCEL">Cancelar</option>
                  </select>
                }
              </div>
            </td>
          </tr>
          <tr *ngIf="interventions().length === 0">
            <td colspan="7" class="py-4 text-center text-slate-500 dark:text-slate-500">
              @if (loading()) {
                Cargando intervenciones…
              } @else if (loadError()) {
                Vuelve a intentarlo con el botón de reintento.
              } @else {
                No hay intervenciones pendientes.
              }
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</div>
`,
  styleUrls: ['./human-intervention.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HumanInterventionComponent implements OnInit {
  private readonly interventionService = inject(HumanInterventionService);
  private readonly notifications = inject(NotificationService);
  private readonly assigneeControls = new Map<string, FormControl<string>>();

  protected readonly interventions = signal<HumanIntervention[]>([]);
  protected readonly loadError = signal<UserFacingError | null>(null);
  protected readonly loading = signal(false);
  protected readonly assigningId = signal<string | null>(null);
  protected readonly actingId = signal<string | null>(null);

  ngOnInit(): void {
    this.loadInterventions();
  }

  protected loadInterventions(): void {
    this.loading.set(true);
    this.loadError.set(null);

    this.interventionService
      .getInterventions(true)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (data) => this.interventions.set(data.filter((item) => item.status === 'PENDING')),
        error: (error) => this.loadError.set(toUserFacingError(error)),
      });
  }

  protected refresh(): void {
    this.loadInterventions();
  }

  protected assigneeControlFor(id: string): FormControl<string> {
    let control = this.assigneeControls.get(id);
    if (!control) {
      control = new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.maxLength(120)],
      });
      this.assigneeControls.set(id, control);
    }
    return control;
  }

  protected assign(item: HumanIntervention): void {
    const control = this.assigneeControlFor(item.id);
    control.markAsTouched();
    if (control.invalid || this.assigningId()) return;

    this.assigningId.set(item.id);
    this.interventionService
      .assignToMe(item.id, control.value.trim())
      .pipe(finalize(() => this.assigningId.set(null)))
      .subscribe({
        next: (updated) => {
          this.interventions.update((list) => list.map((current) => (current.id === item.id ? updated : current)));
          control.reset('');
          this.notifications.success('La intervención quedó asignada correctamente.');
        },
        error: () => {
          // El interceptor muestra el mensaje amigable; el formulario queda listo para reintentar.
        },
      });
  }

  protected onActionSelect(event: Event, item: HumanIntervention): void {
    const select = event.target as HTMLSelectElement;
    const action = select.value as InterventionAction | '';
    select.value = '';
    if (!action || this.actingId()) return;

    this.actingId.set(item.id);
    this.interventionService
      .updateIntervention(item.id, {
        status: action,
        notes: item.resolutionNotes,
      })
      .pipe(finalize(() => this.actingId.set(null)))
      .subscribe({
        next: () => {
          this.interventions.update((list) => list.filter((current) => current.id !== item.id));
          this.notifications.success(
            action === 'RESUME'
              ? 'La intervención se reanudó y el proceso continuará.'
              : 'La intervención se canceló.',
          );
        },
        error: () => {
          // El interceptor muestra el mensaje amigable; el selector queda disponible.
        },
      });
  }

  protected trackById(_index: number, item: HumanIntervention): string {
    return item.id;
  }

  protected statusBadgeClass(status: string): string {
    switch (status) {
      case 'PENDING':
        return 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-400 border border-amber-200 dark:border-amber-800';
      case 'IN_PROGRESS':
        return 'bg-sky-100 dark:bg-sky-900/30 text-sky-800 dark:text-sky-400 border border-sky-200 dark:border-sky-800';
      case 'COMPLETED':
        return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 border border-green-200 dark:border-green-800';
      case 'CANCELLED':
        return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-400 border border-gray-200 dark:border-gray-700';
      default:
        return 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700';
    }
  }
}
