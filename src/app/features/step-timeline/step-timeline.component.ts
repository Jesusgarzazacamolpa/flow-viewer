import { Component, Input, Output, EventEmitter, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProcessExecutionStepResponse } from '../../core/interfaces/process.models';
import { StatusBadgeComponent } from '../status-badge/status-badge.component';
import { IconComponent } from '../../shared/icon/icon.component';

/**
 * Selector `app-step-timeline`. Línea de tiempo presentacional de los pasos de un proceso, con
 * detalle expandible y reintento de pasos fallidos mediante el output `retryStep`.
 */
@Component({
  selector: 'app-step-timeline',
  standalone: true,
  imports: [CommonModule, StatusBadgeComponent, IconComponent],
  templateUrl: './step-timeline.component.html',
  styleUrls: ['./step-timeline.component.css'],
})
export class StepTimelineComponent {
  /** Pasos del proceso con su estado, orden y detalle. */
  @Input() steps: ProcessExecutionStepResponse[] = [];
  /** Habilita el botón de reintento en los pasos fallidos. */
  @Input() retryEnabled = true;
  /** Emite el orden del paso que se desea reintentar. */
  @Output() retryStep = new EventEmitter<number>();

  /** Índice del paso expandido; `null` cuando todos están colapsados. */
  private readonly expandedIndex = signal<number | null>(null);

  /** Número de pasos en estado COMPLETED. */
  readonly completedCount = computed(() =>
    this.steps.filter((s) => s.status?.toUpperCase() === 'COMPLETED').length
  );
  /** Total de pasos recibidos. */
  readonly totalCount = computed(() => this.steps.length);

  /** Expande el paso indicado o lo colapsa si ya estaba abierto. */
  toggleExpanded(index: number): void {
    this.expandedIndex.update((current) => (current === index ? null : index));
  }

  /** Indica si el paso de la posición indicada está expandido. */
  isExpanded(index: number): boolean {
    return this.expandedIndex() === index;
  }

  /** Agrupa el estado del paso en una severidad visual reutilizable. */
  statusSeverity(status: string): 'success' | 'error' | 'warning' | 'info' {
    const s = status?.toUpperCase();
    if (s === 'COMPLETED' || s === 'SUCCESS' || s === 'SENT') return 'success';
    if (s === 'FAILED' || s === 'ERROR') return 'error';
    if (s === 'REQUIRES_INTERVENTION' || s === 'PAUSED_FOR_HUMAN') return 'warning';
    if (s === 'RUNNING' || s === 'IN_PROGRESS') return 'warning';
    return 'info';
  }

  /** Clases del borde y fondo del punto de la línea de tiempo. */
  dotBorderClass(status: string): string {
    const sev = this.statusSeverity(status);
    if (sev === 'success') return 'border-green-500 bg-green-50 dark:bg-green-500/10';
    if (sev === 'error') return 'border-red-500 bg-red-50 dark:bg-red-500/10';
    if (sev === 'warning') return 'border-amber-500 bg-amber-50 dark:bg-amber-500/10';
    return 'border-slate-400 bg-slate-100 dark:bg-slate-500/10';
  }

  /** Clases del relleno interior del punto de la línea de tiempo. */
  dotInnerClass(status: string): string {
    const sev = this.statusSeverity(status);
    if (sev === 'success') return 'bg-green-500 dark:bg-green-400';
    if (sev === 'error') return 'bg-red-500 dark:bg-red-400';
    if (sev === 'warning') return 'bg-amber-500 dark:bg-amber-400';
    return 'bg-slate-400 dark:bg-slate-400';
  }

  /** Nombre del icono de `app-icon` asociado al estado del paso. */
  statusIconName(status: string): string {
    const s = status?.toUpperCase();
    if (s === 'COMPLETED' || s === 'SUCCESS') return 'check';
    if (s === 'FAILED' || s === 'ERROR') return 'exclamation-triangle';
    if (s === 'REQUIRES_INTERVENTION' || s === 'PAUSED_FOR_HUMAN') return 'shield';
    return 'clock';
  }

  /** Indica si el paso falló y, por tanto, admite reintento. */
  canRetry(status: string): boolean {
    const s = status?.toUpperCase();
    return s === 'FAILED' || s === 'ERROR';
  }
}
