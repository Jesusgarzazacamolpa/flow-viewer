import { Component, Input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProcessExecutionStepResponse } from '../../core/interfaces/process.models';
import { StatusBadgeComponent } from '../status-badge/status-badge.component';

@Component({
  selector: 'app-step-timeline',
  standalone: true,
  imports: [CommonModule, StatusBadgeComponent],
  templateUrl: './step-timeline.component.html',
  styleUrls: ['./step-timeline.component.css'],
})
export class StepTimelineComponent {
  @Input() steps: ProcessExecutionStepResponse[] = [];

  readonly completedCount = computed(() =>
    this.steps.filter((s) => s.status?.toUpperCase() === 'COMPLETED').length
  );
  readonly totalCount = computed(() => this.steps.length);

  dotBorderClass(status: string): string {
    const s = status?.toUpperCase();
    if (s === 'COMPLETED') return 'border-green-500 dark:border-green-500 bg-green-50 dark:bg-green-500/10';
    if (s === 'FAILED' || s === 'ERROR') return 'border-red-500 dark:border-red-500 bg-red-50 dark:bg-red-500/10';
    if (s === 'RUNNING' || s === 'IN_PROGRESS') return 'border-sky-500 dark:border-sky-500 bg-sky-50 dark:bg-sky-500/10';
    return 'border-slate-400 dark:border-slate-500 bg-slate-100 dark:bg-slate-500/10';
  }

  dotInnerClass(status: string): string {
    const s = status?.toUpperCase();
    if (s === 'COMPLETED') return 'bg-green-500 dark:bg-green-400';
    if (s === 'FAILED' || s === 'ERROR') return 'bg-red-500 dark:bg-red-400';
    if (s === 'RUNNING' || s === 'IN_PROGRESS') return 'bg-sky-500 dark:bg-sky-400';
    return 'bg-slate-400 dark:bg-slate-400';
  }
}
