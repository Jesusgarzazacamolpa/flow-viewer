import { Component, signal, inject, OnInit, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ControlCenterService } from '../../core/services/control-center.service';
import { OrchestratorService } from '../../core/services/orchestrator.service';
import { Vehicle } from '../../core/interfaces/vehicle.interface';
import { Agent } from '../../core/interfaces/agent.interface';
import { Customer } from '../../core/interfaces/customer.interface';
import { Service } from '../../core/interfaces/service.interface';
import { ProcessExecutionResponse } from '../../core/interfaces/process.models';
import { StatusBadgeComponent } from '../status-badge/status-badge.component';
import { SearchableSelectComponent } from '../../shared/searchable-select/searchable-select.component';

@Component({
  selector: 'app-flow-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, StatusBadgeComponent, SearchableSelectComponent],
  templateUrl: './flow-dashboard.component.html',
  styleUrls: ['./flow-dashboard.component.css'],
})
export class FlowDashboardComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly controlCenter = inject(ControlCenterService);
  private readonly orchestrator = inject(OrchestratorService);

  protected readonly processes = signal<ProcessExecutionResponse[]>([]);
  protected readonly starting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  // Dropdown options
  protected readonly customers = signal<Customer[]>([]);
  protected readonly vehicles = signal<Vehicle[]>([]);
  protected readonly agents = signal<Agent[]>([]);
  protected readonly services = signal<Service[]>([]);

  // Loading states
  protected readonly loadingCustomers = signal(false);
  protected readonly loadingVehicles = signal(false);
  protected readonly loadingAgents = signal(false);
  protected readonly loadingServices = signal(false);

  // Selected values
  protected form = {
    flowId: 'compra-vehiculo',
    customerId: '',
    vehicleId: '',
    salesAgentId: ''
  };

  // Computed select options
  protected customerOptions = computed(() => this.customers().map(c => ({
    value: c.id,
    label: `${c.fullName} (${c.email})`,
    searchText: `${c.fullName} ${c.email} ${c.identificationNumber ?? ''}`
  })));

  protected vehicleOptions = computed(() => this.vehicles()
    .filter(v => v.available === true)
    .map(v => ({
      value: v.vehicle_id,
      label: `${v.brand} ${v.model} ${v.price} - ${v.brand} - $${v.price.toLocaleString()}`,
      searchText: `${v.brand} ${v.model}`
    }))
  );

  protected agentOptions = computed(() => this.agents()
    .filter(a => a.active && (a.specialization === 'VENTAS_NUEVOS' || a.specialization === 'VENTAS_USADOS'))
    .map(a => ({
      value: a.id,
      label: `${a.fullName} - ${a.specialization}`,
      searchText: `${a.fullName} ${a.email} ${a.specialization}`
    }))
  );

  protected serviceOptions = computed(() => this.services()
    .filter(s => s.isActive && (s.category === 'VENTAS' || s.category === 'FINANZAS' || s.category === 'SEGUROS'))
    .map(s => ({
      value: s.id,
      label: `${s.name} (${s.category}) - $${s.basePrice.toLocaleString()}`,
      searchText: `${s.name} ${s.code} ${s.category}`
    }))
  );

  ngOnInit(): void {
    this.refresh();
    this.loadDropdownData();
  }

   loadDropdownData(): void {
     // Load customers
     this.loadingCustomers.set(true);
     this.orchestrator.getActiveCustomers().subscribe({
       next: (data) => {
         // Handle potential different response formats
         const customersData = data && Array.isArray(data.data) ? data.data : (data as any)?.items || [];
         this.customers.set(customersData);
         this.loadingCustomers.set(false);
       },
       error: (err) => {
         this.loadingCustomers.set(false);
         this.errorMessage.set('Error cargando clientes: ' + err.message);
       }
     });

     // Load available vehicles
     this.loadingVehicles.set(true);
     this.orchestrator.getAvailableVehicles().subscribe({
       next: (data) => {
         // Handle potential different response formats
         const vehiclesData = data && Array.isArray(data.data) ? data.data : (data as any)?.items || [];
         this.vehicles.set(vehiclesData);
         this.loadingVehicles.set(false);
       },
       error: (err) => {
         this.loadingVehicles.set(false);
         this.errorMessage.set('Error cargando vehículos: ' + err.message);
       }
     });

     // Load sales agents
     this.loadingAgents.set(true);
     this.orchestrator.getSalesAgents().subscribe({
       next: (data) => {
         // Handle potential different response formats
         const agentsData = data && Array.isArray(data.data) ? data.data : (data as any)?.items || [];
         this.agents.set(agentsData);
         this.loadingAgents.set(false);
       },
       error: (err) => {
         this.loadingAgents.set(false);
         this.errorMessage.set('Error cargando agentes: ' + err.message);
       }
     });

     // Load sales services
     this.loadingServices.set(true);
     this.orchestrator.getSalesServices().subscribe({
       next: (data) => {
         // Handle potential different response formats
         const servicesData = Array.isArray(data) ? data : (data as any)?.items || [];
         this.services.set(servicesData);
         this.loadingServices.set(false);
       },
       error: (err) => {
         this.loadingServices.set(false);
         this.errorMessage.set('Error cargando servicios: ' + err.message);
       }
     });
   }

  refresh(): void {
    this.controlCenter.listProcesses().subscribe({
      next: (data) => this.processes.set(data),
      error: (err) => this.errorMessage.set('Error al cargar ejecuciones: ' + err.message)
    });
  }

  async onStart(): Promise<void> {
    this.starting.set(true);
    this.errorMessage.set(null);

    try {
      const template = await this.controlCenter.getDefaultTemplate().toPromise();
      if (!template) {
        this.errorMessage.set('No se obtuvo la plantilla por defecto');
        return;
      }
      const response = await this.controlCenter.startProcess({
        ...this.form,
        processTemplateId: template.id
      }).toPromise();

      if (!response) {
        this.errorMessage.set('No se obtuvo respuesta del flujo');
        return;
      }

      this.router.navigate(['/tracker', response.id]);
    } catch (err: any) {
      this.errorMessage.set('Error al iniciar el flujo: ' + (err?.message ?? err));
    } finally {
      this.starting.set(false);
    }
  }

  viewProcess(id: string): void {
    this.router.navigate(['/tracker', id]);
  }
}
