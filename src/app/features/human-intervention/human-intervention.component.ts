import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HumanInterventionService } from '../../core/services/human-intervention.service';
import { HumanIntervention } from '../../core/interfaces/intervention.interface';

@Component({
  selector: 'app-human-intervention',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
<div class="space-y-6">
  <header>
    <h1 class="text-2xl font-bold text-slate-900 dark:text-slate-100">Intervención Humana</h1>
    <p class="text-sm text-slate-500 dark:text-slate-400">Pasos que requieren atención manual.</p>
  </header>

  <section class="rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-4">
    <div class="mb-3 flex items-center justify-between">
      <h2 class="text-sm font-medium text-slate-700 dark:text-slate-300">Intervenciones pendientes</h2>
      <button
        (click)="refresh()"
        class="text-xs text-slate-500 dark:text-slate-500 underline hover:text-slate-700 dark:hover:text-slate-300"
      >
        Recargar
      </button>
    </div>

    <div class="overflow-x-auto">
      <table class="w-full border-collapse text-sm">
        <thead>
          <tr class="border-b border-slate-300 dark:border-slate-800 text-left">
            <th class="pb-2 text-xs font-medium uppercase text-slate-500 dark:text-slate-500">Proceso</th>
            <th class="pb-2 text-xs font-medium uppercase text-slate-500 dark:text-slate-500">Paso</th>
            <th class="pb-2 text-xs font-medium uppercase text-slate-500 dark:text-slate-500">Error</th>
            <th class="pb-2 text-xs font-medium uppercase text-slate-500 dark:text-slate-500">Estado</th>
            <th class="pb-2 text-xs font-medium uppercase text-slate-500 dark:text-slate-500">Asignado a</th>
            <th class="pb-2 text-xs font-medium uppercase text-slate-500 dark:text-slate-500">Creado</th>
            <th class="pb-2 text-xs font-medium uppercase text-slate-500 dark:text-slate-500">Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr
            *ngFor="let item of interventions()"
            class="border-b border-slate-200/50 dark:border-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800/30"
          >
            <td class="py-2 font-mono text-xs text-slate-600 dark:text-slate-400">{{ item.processId }}</td>
            <td class="py-2 text-slate-800 dark:text-slate-300">{{ item.stepName }} (orden {{ item.stepOrder }})</td>
            <td class="py-2 text-sm text-slate-700 dark:text-slate-300">{{ item.errorMessage }}</td>
            <td class="py-2">
              <span
                class="inline-block rounded px-2 py-0.5 text-xs font-medium"
                [ngClass]="statusBadgeClass(item.status)"
              >
                {{ item.status }}
              </span>
            </td>
            <td class="py-2 text-slate-700 dark:text-slate-300">
              {{ item.assignedTo || '——' }}
            </td>
            <td class="py-2 text-slate-600 dark:text-slate-500">{{ item.createdAt | date:'shortTime' }}</td>
            <td class="py-2">
              <div class="flex items-center gap-2">
                <input
                  *ngIf="!item.assignedTo"
                  type="text"
                  placeholder="Asignar a..."
                  [(ngModel)]="assigneeName"
                  class="w-32 rounded-md border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2 py-1 text-xs text-slate-800 dark:text-slate-200"
                />
                <button
                  *ngIf="!item.assignedTo"
                  (click)="assign(item)"
                  [disabled]="!assigneeName"
                  class="rounded-md bg-sky-600 px-2 py-1 text-xs font-medium text-white hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Asignar
                </button>
                <select
                  *ngIf="item.assignedTo"
                  (change)="onActionSelect($event, item)"
                  class="rounded-md border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2 py-1 text-xs text-slate-800 dark:text-slate-200"
                >
                  <option value=""> — Acciones — </option>
                  <option value="RESUME">Continuar proceso</option>
                  <option value="CANCEL">Cancelar</option>
                </select>
              </div>
            </td>
          </tr>
          <tr *ngIf="interventions().length === 0">
            <td colspan="7" class="py-4 text-center text-slate-500 dark:text-slate-500">
              No hay intervenciones pendientes.
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>

  <p *ngIf="errorMessage()" class="text-sm text-red-500 dark:text-red-400">{{ errorMessage() }}</p>
</div>
`,
  styleUrls: ['./human-intervention.component.css'],
})
export class HumanInterventionComponent implements OnInit {
  private readonly interventionService = inject(HumanInterventionService);

  protected readonly interventions = signal<HumanIntervention[]>([]);
  protected readonly errorMessage = signal<string | null>(null);
  protected assigneeName = '';

  ngOnInit(): void {
    this.loadInterventions();
  }

  loadInterventions(): void {
    this.interventionService.getInterventions().subscribe({
      next: (data) => this.interventions.set(data.filter(i => i.status === 'PENDING')),
      error: (err) => this.errorMessage.set('Error cargando intervenciones: ' + err.message),
    });
  }

  refresh(): void {
    this.loadInterventions();
  }

  assign(item: HumanIntervention): void {
    if (!this.assigneeName) return;
    this.interventionService.assignToMe(item.id, this.assigneeName).subscribe({
      next: (updated) => {
        this.interventions.update(list =>
          list.map(i => (i.id === item.id ? updated : i))
        );
        this.assigneeName = '';
      },
      error: (err) => this.errorMessage.set('Error asignando intervención: ' + err.message),
    });
  }

  onActionSelect(event: Event, item: HumanIntervention): void {
    const select = event.target as HTMLSelectElement;
    const action = select.value;
    select.value = '';
    if (!action) return;

    this.interventionService.updateIntervention(item.id, {
      status: action as 'RESUME' | 'CANCEL',
      notes: item.resolutionNotes,
    }).subscribe({
      next: (updated) => {
        this.interventions.update(list =>
          list.filter(i => i.id !== item.id)
        );
        if (action === 'CANCEL') {
          this.errorMessage.set(`Intervención ${item.id} cancelada.`);
        }
      },
      error: (err) => this.errorMessage.set('Error actualizando intervención: ' + err.message),
    });
  }

  statusBadgeClass(status: string): string {
    switch (status) {
      case 'PENDING': return 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-400 border border-amber-200 dark:border-amber-800';
      case 'IN_PROGRESS': return 'bg-sky-100 dark:bg-sky-900/30 text-sky-800 dark:text-sky-400 border border-sky-200 dark:border-sky-800';
      case 'COMPLETED': return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 border border-green-200 dark:border-green-800';
      case 'CANCELLED': return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-400 border border-gray-200 dark:border-gray-700';
      default: return 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700';
    }
  }
}
