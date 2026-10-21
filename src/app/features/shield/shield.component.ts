import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ShieldService } from '../../core/services/shield.service';
import { ShieldAlert, ShieldStats } from '../../core/interfaces/shield.interface';

@Component({
  selector: 'app-shield',
  standalone: true,
  imports: [CommonModule],
  template: `
<div class="space-y-6">
  <header>
    <h1 class="text-2xl font-bold text-slate-900 dark:text-slate-100">Shield — Security Dashboard</h1>
    <p class="text-sm text-slate-500 dark:text-slate-400">Monitor de alertas y amenazas en tiempo real.</p>
  </header>

  <!-- Stats cards -->
  <section class="grid grid-cols-1 gap-4 sm:grid-cols-5">
    <div class="rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-4">
      <p class="text-xs uppercase text-slate-500 dark:text-slate-500">Total Alertas</p>
      <p class="text-2xl font-bold text-slate-900 dark:text-slate-100">{{ stats().totalAlerts }}</p>
    </div>
    <div class="rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-4">
      <p class="text-xs uppercase text-slate-500 dark:text-slate-500">Críticas (24h)</p>
      <p class="text-2xl font-bold text-red-600 dark:text-red-400">{{ stats().alertsBySeverity.CRITICAL }}</p>
    </div>
    <div class="rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-4">
      <p class="text-xs uppercase text-slate-500 dark:text-slate-500">Altas (24h)</p>
      <p class="text-2xl font-bold text-orange-600 dark:text-orange-400">{{ stats().alertsBySeverity.HIGH }}</p>
    </div>
    <div class="rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-4">
      <p class="text-xs uppercase text-slate-500 dark:text-slate-500">Resueltas</p>
      <p class="text-2xl font-bold text-green-600 dark:text-green-400">{{ stats().resolvedCount }}</p>
    </div>
    <div class="rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-4">
      <p class="text-xs uppercase text-slate-500 dark:text-slate-500">Últimas 24h</p>
      <p class="text-2xl font-bold text-sky-600 dark:text-sky-400">{{ stats().alertsLast24h }}</p>
    </div>
  </section>

  <!-- Alerts table -->
  <section class="rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-4">
    <div class="mb-3 flex items-center justify-between">
      <h2 class="text-sm font-medium text-slate-700 dark:text-slate-300">Alertas recientes</h2>
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
            <th class="pb-2 text-xs font-medium uppercase text-slate-500 dark:text-slate-500">Severidad</th>
            <th class="pb-2 text-xs font-medium uppercase text-slate-500 dark:text-slate-500">Categoría</th>
            <th class="pb-2 text-xs font-medium uppercase text-slate-500 dark:text-slate-500">Mensaje</th>
            <th class="pb-2 text-xs font-medium uppercase text-slate-500 dark:text-slate-500">Origen</th>
            <th class="pb-2 text-xs font-medium uppercase text-slate-500 dark:text-slate-500">Fecha</th>
            <th class="pb-2 text-xs font-medium uppercase text-slate-500 dark:text-slate-500">Estado</th>
            <th class="pb-2 text-xs font-medium uppercase text-slate-500 dark:text-slate-500">Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr
            *ngFor="let alert of alerts()"
            class="border-b border-slate-200/50 dark:border-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800/30"
          >
            <td class="py-2">
              <span
                class="inline-block rounded px-2 py-0.5 text-xs font-medium"
                [ngClass]="severityClass(alert.severity)"
              >
                {{ alert.severity }}
              </span>
            </td>
            <td class="py-2 text-slate-800 dark:text-slate-300">{{ alert.category }}</td>
            <td class="py-2 text-slate-700 dark:text-slate-300">{{ alert.message }}</td>
            <td class="py-2 text-slate-600 dark:text-slate-400">{{ alert.source }}</td>
            <td class="py-2 text-slate-600 dark:text-slate-500">{{ alert.timestamp | date:'short' }}</td>
            <td class="py-2">
              <span
                class="inline-block rounded px-2 py-0.5 text-xs font-medium"
                [class]="alert.resolved ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400 border border-green-200 dark:border-green-800' : 'bg-amber-100 dark:bg-amber-900/20 text-amber-800 dark:text-amber-400 border border-amber-200 dark:border-amber-800'"
              >
                {{ alert.resolved ? 'Resuelta' : 'Activa' }}
              </span>
            </td>
            <td class="py-2">
              <button
                *ngIf="!alert.resolved"
                (click)="resolve(alert)"
                class="text-xs text-sky-600 dark:text-sky-400 underline hover:text-sky-800 dark:hover:text-sky-300"
              >
                Resolver
              </button>
              <span *ngIf="alert.resolved" class="text-xs text-slate-500 dark:text-slate-500">—</span>
            </td>
          </tr>
          <tr *ngIf="alerts().length === 0">
            <td colspan="7" class="py-4 text-center text-slate-500 dark:text-slate-500">
              No hay alertas.
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</div>
`,
  styleUrls: ['./shield.component.css'],
})
export class ShieldComponent implements OnInit {
  private readonly shieldService = inject(ShieldService);

  protected readonly alerts = signal<ShieldAlert[]>([]);
  protected readonly stats = signal<ShieldStats>({
    totalAlerts: 0,
    alertsBySeverity: { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 },
    alertsLast24h: 0,
    resolvedCount: 0,
  });
  protected readonly errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.shieldService.getAlerts().subscribe({
      next: (data) => this.alerts.set(data),
      error: (err) => this.errorMessage.set('Error cargando alertas: ' + err.message),
    });
    this.shieldService.getStats().subscribe({
      next: (data) => this.stats.set(data),
      error: (err) => this.errorMessage.set('Error cargando estadísticas: ' + err.message),
    });
  }

  resolve(alert: ShieldAlert): void {
    this.shieldService.resolveAlert(alert.id).subscribe({
      next: () => {
        this.alerts.update(list =>
          list.map(a => (a.id === alert.id ? { ...a, resolved: true } : a))
        );
      },
      error: (err) => this.errorMessage.set('Error resolviendo alerta: ' + err.message),
    });
  }

  refresh(): void {
    this.loadData();
  }

  severityClass(severity: string): string {
    switch (severity) {
      case 'CRITICAL': return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 border border-red-200 dark:border-red-800';
      case 'HIGH': return 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-400 border border-orange-200 dark:border-orange-800';
      case 'MEDIUM': return 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-400 border border-amber-200 dark:border-amber-800';
      case 'LOW': return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 border border-blue-200 dark:border-blue-800';
      default: return 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700';
    }
  }
}
