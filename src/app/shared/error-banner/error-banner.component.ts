import { Component, input, output } from '@angular/core';
import { IconComponent } from '../icon/icon.component';

/**
 * Selector `app-error-banner`. Banner presentacional de error con código de referencia opcional y
 * botón de reintento; emite `retry` cuando el consumidor quiere repetir la operación.
 */
@Component({
  selector: 'app-error-banner',
  standalone: true,
  imports: [IconComponent],
  template: `
    <div
      role="alert"
      class="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-900/20"
    >
      <div class="flex items-start gap-3">
        <app-icon
          name="exclamation-circle"
          size="md"
          colorClass="text-red-600 dark:text-red-400"
        />
        <div class="min-w-0 flex-1">
          <p class="text-sm font-medium text-red-900 dark:text-red-300">{{ title() }}</p>
          <p class="mt-1 text-sm text-red-800 dark:text-red-300">{{ message() }}</p>
          @if (reference()) {
            <p class="mt-1 text-xs text-red-700/80 dark:text-red-400/80">
              Código de referencia: <span class="font-mono">{{ reference() }}</span>
            </p>
          }
          @if (retryable()) {
            <button
              type="button"
              (click)="retry.emit()"
              class="mt-3 inline-flex items-center gap-1.5 rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
            >
              <app-icon name="arrow-path" size="xs" />
              {{ retryLabel() }}
            </button>
          }
        </div>
      </div>
    </div>
  `,
})
export class ErrorBannerComponent {
  /** Título del banner; por defecto "No pudimos completar la acción". */
  readonly title = input('No pudimos completar la acción');
  /** Mensaje de error legible; es obligatorio. */
  readonly message = input.required<string>();
  /** Código de referencia opcional para soporte o trazabilidad. */
  readonly reference = input<string>();
  /** Texto del botón de reintento. */
  readonly retryLabel = input('Reintentar');
  /** Muestra u oculta el botón de reintento. */
  readonly retryable = input(true);
  /** Se emite al pulsar el botón de reintento. */
  readonly retry = output<void>();
}
