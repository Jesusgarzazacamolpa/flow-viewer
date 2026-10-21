import { Component, OnInit, OnDestroy, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { ControlCenterService } from '../../core/services/control-center.service';
import { FlowSseService } from '../../core/services/flow-sse.service';
import { ProcessExecutionResponse, ProcessExecutionStepResponse } from '../../core/interfaces/process.models';
import { StatusBadgeComponent } from '../status-badge/status-badge.component';
import { StepTimelineComponent } from '../step-timeline/step-timeline.component';
import { EventLogComponent } from '../event-log/event-log.component';

@Component({
  selector: 'app-flow-tracker',
  standalone: true,
  imports: [CommonModule, StatusBadgeComponent, StepTimelineComponent, EventLogComponent],
  templateUrl: './flow-tracker.component.html',
  styleUrls: ['./flow-tracker.component.css'],
})
export class FlowTrackerComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly controlCenter = inject(ControlCenterService);
  protected readonly sse = inject(FlowSseService);

  protected processId = '';
  protected readonly process = signal<ProcessExecutionResponse | null>(null);
  protected readonly stepResponses = signal<ProcessExecutionStepResponse[]>([]);

  protected readonly completedSteps = computed(() =>
    this.stepResponses().filter((s) => s.status?.toUpperCase() === 'COMPLETED').length
  );
  protected readonly totalSteps = computed(() => this.stepResponses().length);
  protected readonly allCompleted = computed(() =>
    this.totalSteps() > 0 && this.completedSteps() === this.totalSteps()
  );
  protected readonly hasFailed = computed(() =>
    this.stepResponses().some((s) => s.status?.toUpperCase() === 'FAILED' || s.status?.toUpperCase() === 'ERROR')
  );
  protected readonly progressLabel = computed(() => {
    if (this.hasFailed()) return 'Falló el proceso';
    if (this.allCompleted()) return '¡Proceso completado!';
    return `${this.completedSteps()} de ${this.totalSteps()} pasos completados`;
  });

  ngOnInit(): void {
    this.processId = this.route.snapshot.paramMap.get('id') ?? '';

    if (this.processId) {
      this.controlCenter.getProcess(this.processId).subscribe({
        next: (data) => this.process.set(data),
        error: (err) => console.error('Error fetching process:', err)
      });
      this.controlCenter.getProcessSteps(this.processId).subscribe({
        next: (data) => this.stepResponses.set(data),
        error: (err) => console.error('Error fetching steps:', err)
      });
      this.sse.connect(this.processId);
    }
  }

  ngOnDestroy(): void {
    this.sse.disconnect();
  }
}
