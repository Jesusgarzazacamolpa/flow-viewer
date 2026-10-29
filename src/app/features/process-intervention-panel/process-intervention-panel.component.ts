import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { IconComponent } from '../../shared/icon/icon.component';
import { InterventionResponse } from '../../core/interfaces/process.models';

@Component({
  selector: 'app-process-intervention-panel',
  standalone: true,
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section
      class="rounded-lg border border-amber-300 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-900/20"
    >
      <div class="mb-3 flex items-center gap-3">
        <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
          <app-icon name="shield" size="md" colorClass="text-amber-600 dark:text-amber-400" />
        </div>
        <div>
          <h3 class="text-sm font-medium text-amber-900 dark:text-amber-300">Intervención humana requerida</h3>
          <p class="text-xs text-amber-700 dark:text-amber-400">{{ intervention().stepName }}</p>
        </div>
      </div>
      @if (intervention().errorMessage) {
        <p class="mb-3 text-sm text-amber-800 dark:text-amber-200">
          {{ intervention().errorMessage }}
        </p>
      }
      @if (intervention().suggestedAction) {
        <p class="mb-4 text-xs text-amber-700 dark:text-amber-300">
          Acción sugerida: {{ intervention().suggestedAction }}
        </p>
      }
      <div class="flex gap-2">
        <button
          type="button"
          (click)="resume.emit()"
          [disabled]="resuming() || rejecting()"
          class="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {{ resuming() ? 'Reanudando…' : 'Reanudar proceso' }}
        </button>
        <button
          type="button"
          (click)="reject.emit()"
          [disabled]="resuming() || rejecting()"
          class="rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-900/30"
        >
          {{ rejecting() ? 'Rechazando…' : 'Rechazar intervención' }}
        </button>
      </div>
    </section>
  `,
})
/**
 * Selector `app-process-intervention-panel`. Panel presentacional de una intervención humana
 * pendiente; muestra el paso, el error y la acción sugerida, y emite `resume` o `reject`.
 */
export class ProcessInterventionPanelComponent {
  /** Intervención pendiente con los datos del paso que requiere revisión. */
  readonly intervention = input.required<InterventionResponse>();
  /** Indica que la reanudación está en curso para deshabilitar ambos botones. */
  readonly resuming = input(false);
  /** Indica que el rechazo está en curso para deshabilitar ambos botones. */
  readonly rejecting = input(false);
  /** Se emite al solicitar reanudar el proceso tras la intervención. */
  readonly resume = output<void>();
  /** Se emite al solicitar rechazar la intervención y cancelar el proceso. */
  readonly reject = output<void>();
}
