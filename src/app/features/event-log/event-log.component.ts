import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FlowExecutionEvent } from '../../core/interfaces/process.models';
import { IconComponent } from '../../shared/icon/icon.component';

@Component({
  selector: 'app-event-log',
  standalone: true,
  imports: [CommonModule, IconComponent],
  templateUrl: './event-log.component.html',
  styleUrls: ['./event-log.component.css'],
})
export class EventLogComponent {
  @Input() events: FlowExecutionEvent[] = [];

  trackByIdx(index: number, _: FlowExecutionEvent): number {
    return index;
  }

  trackById(index: number, _: FlowExecutionEvent): number {
    return index;
  }

  eventBorderClass(eventType: string): string {
    switch (eventType) {
      case 'STEP_COMPLETED': return 'border-green-500 dark:border-green-500';
      case 'STEP_FAILED': return 'border-red-500 dark:border-red-500';
      case 'FLOW_COMPLETED': return 'border-green-500 dark:border-green-500';
      case 'FLOW_FAILED': return 'border-red-500 dark:border-red-500';
      case 'STEP_STARTED': return 'border-sky-500 dark:border-sky-500';
      case 'FLOW_STARTED': return 'border-sky-500 dark:border-sky-500';
      default: return 'border-slate-300 dark:border-slate-700';
    }
  }

  eventTypeBadgeClass(eventType: string): string {
    switch (eventType) {
      case 'STEP_COMPLETED':
      case 'FLOW_COMPLETED':
        return 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400 border border-green-200 dark:border-green-800';
      case 'STEP_FAILED':
      case 'FLOW_FAILED':
        return 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-400 border border-red-200 dark:border-red-800';
      case 'STEP_STARTED':
      case 'FLOW_STARTED':
        return 'bg-sky-100 dark:bg-sky-900/20 text-sky-800 dark:text-sky-400 border border-sky-200 dark:border-sky-800';
      default:
        return 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700';
    }
  }

  eventIconName(eventType: string): string {
    switch (eventType) {
      case 'STEP_COMPLETED':
      case 'FLOW_COMPLETED':
        return 'check';
      case 'STEP_FAILED':
      case 'FLOW_FAILED':
        return 'exclamation-triangle';
      default:
        return 'clock';
    }
  }
}
