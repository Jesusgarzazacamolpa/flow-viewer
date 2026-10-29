import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { IconComponent } from '../../shared/icon/icon.component';

@Component({
  selector: 'app-process-error-panel',
  standalone: true,
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section
      role="alert"
      class="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-900/20"
    >
      <h3 class="mb-2 flex items-center gap-2 text-sm font-medium text-red-900 dark:text-red-300">
        <app-icon name="exclamation-circle" size="sm" colorClass="text-red-600 dark:text-red-400" />
        {{ title() || 'Error del proceso' }}
      </h3>
      <p class="mb-3 text-sm text-red-800 dark:text-red-300">
        {{ message() || 'Error desconocido' }}
      </p>
      <button
        type="button"
        (click)="retry.emit()"
        [disabled]="busy()"
        class="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {{ busy() ? 'Reintentando…' : (actionLabel() || 'Reintentar proceso') }}
      </button>
    </section>
  `,
})
/**
 * Selector `app-process-error-panel`. Panel presentacional de error con botón de reintento; recibe
 * título, mensaje, etiqueta y estado ocupado, y emite `retry` al pulsar el botón.
 */
export class ProcessErrorPanelComponent {
  /** Título opcional; por defecto se muestra "Error del proceso". */
  readonly title = input<string | null>(null);
  /** Detalle del error mostrado al usuario. */
  readonly message = input<string | null>(null);
  /** Texto del botón de acción; por defecto "Reintentar proceso". */
  readonly actionLabel = input<string | null>(null);
  /** Deshabilita el botón y muestra "Reintentando…" mientras hay una acción en curso. */
  readonly busy = input(false);
  /** Se emite al pulsar el botón de reintento. */
  readonly retry = output<void>();
}
