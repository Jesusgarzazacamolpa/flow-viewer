import { Component, inject } from '@angular/core';
import { NotificationService, Toast, ToastTone } from '../../core/services/notification.service';
import { IconComponent } from '../icon/icon.component';

/**
 * Selector `app-toast-container`. Contenedor fijo que renderiza las notificaciones globales de
 * `NotificationService` y permite ejecutar su acción o descartarlas.
 */
@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [IconComponent],
  template: `
    <div
      class="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 p-4 sm:inset-x-auto sm:right-0 sm:items-end"
      aria-live="polite"
      aria-atomic="false"
    >
      @for (toast of notifications.toasts(); track toast.id) {
        <div
          class="pointer-events-auto w-full max-w-sm rounded-xl border p-4 shadow-lg transition-colors"
          [class]="toneContainerClass(toast.tone)"
          [attr.role]="toast.tone === 'error' || toast.tone === 'warning' ? 'alert' : 'status'"
        >
          <div class="flex items-start gap-3">
            <span class="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full" [class]="toneIconWrapperClass(toast.tone)">
              <app-icon [name]="toneIcon(toast.tone)" size="sm" colorClass="text-white" [strokeWidth]="2" />
            </span>

            <div class="min-w-0 flex-1">
              <p class="text-sm font-semibold">{{ toast.title }}</p>
              <p class="mt-0.5 text-sm opacity-90">{{ toast.message }}</p>
              @if (toast.reference) {
                <p class="mt-1 text-xs opacity-70">
                  Código de referencia: <span class="font-mono">{{ toast.reference }}</span>
                </p>
              }
              @if (toast.action) {
                <button
                  type="button"
                  (click)="notifications.runAction(toast.id)"
                  class="mt-2 inline-flex items-center gap-1.5 rounded-md border border-current px-2.5 py-1 text-xs font-medium transition-opacity hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-current"
                >
                  <app-icon [name]="actionIcon(toast.tone)" size="xs" />
                  {{ toast.action.label }}
                </button>
              }
            </div>

            <button
              type="button"
              (click)="notifications.dismiss(toast.id)"
              class="shrink-0 rounded p-1 opacity-60 transition-opacity hover:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-current"
              aria-label="Cerrar notificación"
            >
              <app-icon name="x-mark" size="sm" />
            </button>
          </div>
        </div>
      }
    </div>
  `,
})
export class ToastContainerComponent {
  /** Servicio compartido del que se leen y descartan los toasts. */
  protected readonly notifications = inject(NotificationService);

  /** Clases de borde, fondo y texto del toast según su tono. */
  protected toneContainerClass(tone: ToastTone): string {
    switch (tone) {
      case 'success':
        return 'border-green-200 bg-green-50 text-green-900 dark:border-green-800 dark:bg-green-950 dark:text-green-100';
      case 'warning':
        return 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100';
      case 'info':
        return 'border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-100';
      default:
        return 'border-red-200 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-100';
    }
  }

  /** Clases de fondo del círculo que envuelve el icono del tono. */
  protected toneIconWrapperClass(tone: ToastTone): string {
    switch (tone) {
      case 'success':
        return 'bg-green-600 dark:bg-green-500';
      case 'warning':
        return 'bg-amber-600 dark:bg-amber-500';
      case 'info':
        return 'bg-sky-600 dark:bg-sky-500';
      default:
        return 'bg-red-600 dark:bg-red-500';
    }
  }

  /** Nombre del icono que representa el tono del toast. */
  protected toneIcon(tone: ToastTone): string {
    switch (tone) {
      case 'success':
        return 'check';
      case 'warning':
        return 'exclamation-triangle';
      case 'info':
        return 'information-circle';
      default:
        return 'exclamation-circle';
    }
  }

  /** Icono del botón de acción: reintentar en errores y avisos, confirmar en el resto. */
  protected actionIcon(tone: ToastTone): string {
    return tone === 'error' || tone === 'warning' ? 'arrow-path' : 'check';
  }
}
