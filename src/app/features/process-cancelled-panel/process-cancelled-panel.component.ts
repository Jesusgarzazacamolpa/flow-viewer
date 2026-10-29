import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { IconComponent } from '../../shared/icon/icon.component';

@Component({
  selector: 'app-process-cancelled-panel',
  standalone: true,
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section
      class="rounded-lg border border-slate-300 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/50"
    >
      <h3 class="mb-2 flex items-center gap-2 text-sm font-medium text-slate-800 dark:text-slate-200">
        <app-icon name="x-mark" size="sm" colorClass="text-slate-500 dark:text-slate-400" />
        {{ title() || 'Proceso cancelado' }}
      </h3>
      <p class="text-sm text-slate-700 dark:text-slate-300">
        {{ message() || 'El proceso se canceló y no puede reanudarse.' }}
      </p>
    </section>
  `,
})
/**
 * Selector `app-process-cancelled-panel`. Panel presentacional que informa que un proceso quedó
 * cancelado; recibe el título y el mensaje por inputs y no emite eventos.
 */
export class ProcessCancelledPanelComponent {
  /** Título opcional; si se omite se muestra "Proceso cancelado". */
  readonly title = input<string | null>(null);
  /** Mensaje explicativo opcional sobre el motivo de la cancelación. */
  readonly message = input<string | null>(null);
}
