import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { IconComponent } from '../../shared/icon/icon.component';

/** Texto por defecto cuando el proceso está pausado pero no hay una intervención registrada. */
const DEFAULT_DESCRIPTION =
  'No hay una autorización pendiente registrada. Puedes reanudarlo; si el orquestador ya no conserva el estado, se reiniciará desde el principio.';

/**
 * Selector `app-process-paused-panel`. Panel presentacional que explica que el proceso está
 * pausado y ofrece un botón para reanudarlo mediante el output `resume`.
 */
@Component({
  selector: 'app-process-paused-panel',
  standalone: true,
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section
      class="rounded-lg border border-amber-300 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-900/20"
    >
      <div class="mb-3 flex items-center gap-3">
        <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
          <app-icon name="clock" size="md" colorClass="text-amber-600 dark:text-amber-400" />
        </div>
        <div>
          <h3 class="text-sm font-medium text-amber-900 dark:text-amber-300">El proceso está pausado</h3>
          <p class="text-xs text-amber-700 dark:text-amber-400">{{ description() }}</p>
        </div>
      </div>
      <button
        type="button"
        (click)="resume.emit()"
        [disabled]="busy()"
        class="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {{ busy() ? busyLabel() : label() }}
      </button>
    </section>
  `,
})
export class ProcessPausedPanelComponent {
  /** Texto descriptivo bajo el título; por defecto usa `DEFAULT_DESCRIPTION`. */
  readonly description = input(DEFAULT_DESCRIPTION);
  /** Etiqueta del botón cuando no hay una acción en curso. */
  readonly label = input('Reanudar proceso');
  /** Etiqueta del botón mientras se reanuda el proceso. */
  readonly busyLabel = input('Reanudando…');
  /** Deshabilita el botón mientras hay una reanudación en curso. */
  readonly busy = input(false);
  /** Se emite al pulsar el botón para reanudar el proceso. */
  readonly resume = output<void>();
}
