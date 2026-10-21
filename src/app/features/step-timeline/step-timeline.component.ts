import { Component, Input, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProcessExecutionStepResponse } from '../../core/interfaces/process.models';
import { StatusBadgeComponent } from '../status-badge/status-badge.component';
import { IconComponent } from '../../shared/icon/icon.component';

@Component({
  selector: 'app-step-timeline',
  standalone: true,
  imports: [CommonModule, StatusBadgeComponent, IconComponent],
  templateUrl: './step-timeline.component.html',
  styleUrls: ['./step-timeline.component.css'],
})
export class StepTimelineComponent {
  @Input() steps: ProcessExecutionStepResponse[] = [];

  private readonly expandedIndex = signal<number | null>(null);

  readonly completedCount = computed(() =>
    this.steps.filter((s) => s.status?.toUpperCase() === 'COMPLETED').length
  );
  readonly totalCount = computed(() => this.steps.length);

  toggleExpanded(index: number): void {
    this.expandedIndex.update((current) => (current === index ? null : index));
  }

  isExpanded(index: number): boolean {
    return this.expandedIndex() === index;
  }

  statusSeverity(status: string): 'success' | 'error' | 'warning' | 'info' {
    const s = status?.toUpperCase();
    if (s === 'COMPLETED' || s === 'SUCCESS' || s === 'SENT') return 'success';
    if (s === 'FAILED' || s === 'ERROR') return 'error';
    if (s === 'RUNNING' || s === 'IN_PROGRESS') return 'warning';
    return 'info';
  }

  dotBorderClass(status: string): string {
    const sev = this.statusSeverity(status);
    if (sev === 'success') return 'border-green-500 bg-green-50 dark:bg-green-500/10';
    if (sev === 'error') return 'border-red-500 bg-red-50 dark:bg-red-500/10';
    if (sev === 'warning') return 'border-sky-500 bg-sky-50 dark:bg-sky-500/10';
    return 'border-slate-400 bg-slate-100 dark:bg-slate-500/10';
  }

  dotInnerClass(status: string): string {
    const sev = this.statusSeverity(status);
    if (sev === 'success') return 'bg-green-500 dark:bg-green-400';
    if (sev === 'error') return 'bg-red-500 dark:bg-red-400';
    if (sev === 'warning') return 'bg-sky-500 dark:bg-sky-400';
    return 'bg-slate-400 dark:bg-slate-400';
  }

  statusIconName(status: string): string {
    const s = status?.toUpperCase();
    if (s === 'COMPLETED' || s === 'SUCCESS') return 'check';
    if (s === 'FAILED' || s === 'ERROR') return 'exclamation-triangle';
    return 'clock';
  }
}
