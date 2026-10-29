import { Component, Input, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../../shared/icon/icon.component';

/**
 * Selector `app-status-badge`. Badge presentacional que muestra un estado como texto, color e icono;
 * su único input es `status` y no emite eventos.
 */
@Component({
  selector: 'app-status-badge',
  standalone: true,
  imports: [CommonModule, IconComponent],
  templateUrl: './status-badge.component.html',
  styleUrls: ['./status-badge.component.css'],
})
export class StatusBadgeComponent {
  private readonly _status = signal<string>('UNKNOWN');

  /** Estado a mostrar; se normaliza a mayúsculas y cae en "UNKNOWN" si viene vacío. */
  @Input()
  set status(val: string) {
    this._status.set(val?.toUpperCase() || 'UNKNOWN');
  }
  get status(): string {
    return this._status();
  }

  /** Etiqueta legible del estado; los códigos desconocidos se muestran como "Desconocido". */
  readonly label = computed(() => {
    switch (this._status()) {
      case 'PENDING':
        return 'Pendiente';
      case 'RUNNING':
        return 'En ejecución';
      case 'IN_PROGRESS':
        return 'En progreso';
      case 'CREATED':
        return 'Creado';
      case 'COMPLETED':
        return 'Completado';
      case 'SUCCESS':
        return 'Exitoso';
      case 'SENT':
        return 'Enviado';
      case 'FAILED':
        return 'Fallido';
      case 'ERROR':
        return 'Error';
      case 'CANCELLED':
        return 'Cancelado';
      case 'PAUSED_FOR_HUMAN':
        return 'Pausado para revisión';
      case 'REQUIRES_INTERVENTION':
        return 'Requiere intervención';
      case 'PENDING_REVIEW':
        return 'Pendiente de revisión';
      case 'APPROVED':
        return 'Aprobado';
      case 'REJECTED':
        return 'Rechazado';
      case 'ACTIVE':
        return 'Activo';
      case 'INACTIVE':
        return 'Inactivo';
      default:
        return 'Desconocido';
    }
  });

  /** Clases del contenedor del badge según la familia de estado. */
  readonly badgeClass = computed(() => {
    const s = this._status();
    switch (s) {
      case 'COMPLETED':
      case 'SUCCESS':
      case 'SENT':
        return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 border border-green-200 dark:border-green-800';
      case 'PENDING':
        return 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700';
      case 'FAILED':
      case 'ERROR':
        return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 border border-red-200 dark:border-red-800';
      case 'CANCELLED':
        return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-400 border border-gray-200 dark:border-gray-700';
      case 'PAUSED_FOR_HUMAN':
        return 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-400 border border-amber-200 dark:border-amber-800';
      default:
        return 'bg-sky-100 dark:bg-sky-900/30 text-sky-800 dark:text-sky-400 border border-sky-200 dark:border-sky-800';
    }
  });

  /** Clases del punto indicador de color que acompaña a la etiqueta. */
  readonly dotClass = computed(() => {
    const s = this._status();
    switch (s) {
      case 'COMPLETED':
      case 'SUCCESS':
      case 'SENT':
        return 'bg-green-600 dark:bg-green-400';
      case 'PENDING':
        return 'bg-slate-500';
      case 'FAILED':
      case 'ERROR':
        return 'bg-red-600 dark:bg-red-400';
      case 'CANCELLED':
        return 'bg-gray-500';
      case 'PAUSED_FOR_HUMAN':
        return 'bg-amber-600 dark:bg-amber-400';
      default:
        return 'bg-sky-600 dark:bg-sky-400';
    }
  });

  /** Estados en curso a los que se les aplica la animación de pulso. */
  private readonly animatedStatuses = new Set(['RUNNING', 'IN_PROGRESS', 'CREATED']);

   /** Indica si el badge debe animarse por corresponder a un estado en ejecución. */
   isAnimated() {
     return this.animatedStatuses.has(this._status());
   }

   /** Nombre del icono de `app-icon` asociado a la familia del estado. */
   statusIconName(): string {
     const s = this._status();
     if (s === 'COMPLETED' || s === 'SUCCESS' || s === 'SENT') return 'check';
     if (s === 'FAILED' || s === 'ERROR') return 'exclamation-triangle';
     if (s === 'PAUSED_FOR_HUMAN') return 'shield';
     return 'clock';
   }
}
