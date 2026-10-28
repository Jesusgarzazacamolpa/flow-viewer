import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize, startWith } from 'rxjs';
import { ControlCenterService } from '../../core/services/control-center.service';
import { OrchestratorService } from '../../core/services/orchestrator.service';
import { NotificationService } from '../../core/services/notification.service';
import { Vehicle } from '../../core/interfaces/vehicle.interface';
import { Agent } from '../../core/interfaces/agent.interface';
import { Customer } from '../../core/interfaces/customer.interface';
import { Service } from '../../core/interfaces/service.interface';
import { ProcessExecutionResponse } from '../../core/interfaces/process.models';
import { DEFAULT_FLOW_ID, DEFAULT_TEMPLATE_NAME, FLOW_CATALOG } from '../../core/constants/flow-catalog';
import { UserFacingError } from '../../core/models/api-error.model';
import { toUserFacingError } from '../../core/interceptors/http-error.interceptor';
import { StatusBadgeComponent } from '../status-badge/status-badge.component';
import { SearchableSelectComponent } from '../../shared/searchable-select/searchable-select.component';
import { IconComponent } from '../../shared/icon/icon.component';
import { ProcessProgressDialogComponent } from '../process-progress-dialog/process-progress-dialog.component';
import { ErrorBannerComponent } from '../../shared/error-banner/error-banner.component';

type FormDataset = 'template' | 'customers' | 'vehicles' | 'agents' | 'services';

@Component({
  selector: 'app-flow-dashboard',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    StatusBadgeComponent,
    SearchableSelectComponent,
    IconComponent,
    ProcessProgressDialogComponent,
    ErrorBannerComponent,
  ],
  templateUrl: './flow-dashboard.component.html',
  styleUrls: ['./flow-dashboard.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FlowDashboardComponent implements OnInit {
  private readonly controlCenter = inject(ControlCenterService);
  private readonly orchestrator = inject(OrchestratorService);
  private readonly notifications = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder).nonNullable;

  protected readonly flowOptions = FLOW_CATALOG.map((flow) => ({
    value: flow.id,
    label: flow.label,
  }));

  protected readonly form = this.fb.group({
    flowId: [DEFAULT_FLOW_ID, Validators.required],
    customerId: ['', Validators.required],
    vehicleId: ['', Validators.required],
    salesAgentId: ['', Validators.required],
  });

  private readonly formStatus = toSignal(
    this.form.statusChanges.pipe(startWith(this.form.status)),
    { initialValue: this.form.status },
  );

  protected readonly processes = signal<ProcessExecutionResponse[]>([]);
  protected readonly starting = signal(false);
  protected readonly loadingProcesses = signal(false);
  protected readonly listError = signal<UserFacingError | null>(null);
  protected readonly formDataError = signal<UserFacingError | null>(null);

  protected readonly defaultTemplateId = signal<string | null>(null);

  protected readonly dialogProcessId = signal<string | null>(null);
  protected readonly isDialogOpen = computed(() => this.dialogProcessId() !== null);
  private readonly dialogSnapshot = signal<ProcessExecutionResponse | null>(null);

  protected readonly customers = signal<Customer[]>([]);
  protected readonly vehicles = signal<Vehicle[]>([]);
  protected readonly agents = signal<Agent[]>([]);
  protected readonly services = signal<Service[]>([]);

  protected readonly loadingCustomers = signal(false);
  protected readonly loadingVehicles = signal(false);
  protected readonly loadingAgents = signal(false);
  protected readonly loadingServices = signal(false);

  protected readonly customerLoadError = signal<string | null>(null);
  protected readonly vehicleLoadError = signal<string | null>(null);
  protected readonly agentLoadError = signal<string | null>(null);
  protected readonly serviceLoadError = signal<string | null>(null);

  protected readonly customerOptions = computed(() =>
    this.customers().map((customer) => ({
      value: customer.id,
      label: `${customer.fullName} (${customer.email})`,
      searchText: `${customer.fullName} ${customer.email} ${customer.identificationNumber ?? ''}`,
    })),
  );

  private readonly customerNameById = computed(
    () => new Map(this.customers().map((customer) => [customer.id, customer.fullName])),
  );

  protected customerNameFor(customerId?: string | null): string {
    if (!customerId) return '—';
    return this.customerNameById().get(customerId) ?? customerId;
  }

  protected readonly dialogProcess = computed(() => {
    const id = this.dialogProcessId();
    if (!id) return null;
    return this.processes().find((process) => process.id === id) ?? this.dialogSnapshot();
  });

  protected readonly dialogCustomerName = computed(() => {
    const customerId = this.dialogProcess()?.customerId;
    return customerId ? this.customerNameById().get(customerId) ?? null : null;
  });

  protected readonly dialogTemplateName = computed(() => {
    const templateId = this.dialogProcess()?.processTemplateId;
    return templateId && templateId === this.defaultTemplateId() ? DEFAULT_TEMPLATE_NAME : null;
  });

  protected readonly vehicleOptions = computed(() =>
    this.vehicles()
      .filter((vehicle) => vehicle.available === true)
      .map((vehicle) => ({
        value: vehicle.vehicle_id,
        label: `${vehicle.brand} ${vehicle.model} - $${vehicle.price.toLocaleString()}`,
        searchText: `${vehicle.brand} ${vehicle.model}`,
      })),
  );

  protected readonly agentOptions = computed(() =>
    this.agents()
      .filter(
        (agent) =>
          agent.isActive &&
          (agent.specialization === 'VENTAS_NUEVOS' || agent.specialization === 'VENTAS_USADOS'),
      )
      .map((agent) => ({
        value: agent.id,
        label: `${agent.fullName} - ${agent.specialization}`,
        searchText: `${agent.fullName} ${agent.email} ${agent.specialization}`,
      })),
  );

  protected readonly serviceOptions = computed(() =>
    this.services()
      .filter(
        (service) =>
          service.isActive &&
          (service.category === 'VENTAS' || service.category === 'FINANZAS' || service.category === 'SEGUROS'),
      )
      .map((service) => ({
        value: service.id,
        label: `${service.name} (${service.category}) - $${service.basePrice.toLocaleString()}`,
        searchText: `${service.name} ${service.code} ${service.category}`,
      })),
  );

  protected readonly canStart = computed(
    () => this.formStatus() === 'VALID' && !this.starting() && this.defaultTemplateId() !== null,
  );

  protected readonly startHint = computed(() => {
    if (this.starting()) return '';
    if (this.defaultTemplateId() === null) {
      return 'Esperando la configuración del flujo. Si el problema persiste, reintenta la carga.';
    }
    if (this.formStatus() !== 'VALID') {
      return 'Completa todos los campos para iniciar el flujo';
    }
    return '';
  });

  ngOnInit(): void {
    this.refresh();
    this.loadFormData();
  }

  protected loadFormData(): void {
    this.formDataError.set(null);
    this.loadTemplate();

    this.loadingCustomers.set(true);
    this.customerLoadError.set(null);
    this.orchestrator
      .getActiveCustomers(true)
      .pipe(finalize(() => this.loadingCustomers.set(false)), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => this.customers.set(this.toArray<Customer>(response)),
        error: (error) => {
          this.captureFormError('customers', error);
          this.customerLoadError.set('No pudimos cargar los clientes.');
        },
      });

    this.loadingVehicles.set(true);
    this.vehicleLoadError.set(null);
    this.orchestrator
      .getAvailableVehicles(true)
      .pipe(finalize(() => this.loadingVehicles.set(false)), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => this.vehicles.set(this.toArray<Vehicle>(response)),
        error: (error) => {
          this.captureFormError('vehicles', error);
          this.vehicleLoadError.set('No pudimos cargar los vehículos.');
        },
      });

    this.loadingAgents.set(true);
    this.agentLoadError.set(null);
    this.orchestrator
      .getSalesAgents(true)
      .pipe(finalize(() => this.loadingAgents.set(false)), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => this.agents.set(this.toArray<Agent>(response)),
        error: (error) => {
          this.captureFormError('agents', error);
          this.agentLoadError.set('No pudimos cargar los agentes.');
        },
      });

    this.loadingServices.set(true);
    this.serviceLoadError.set(null);
    this.orchestrator
      .getSalesServices(true)
      .pipe(finalize(() => this.loadingServices.set(false)), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => this.services.set(this.toArray<Service>(response)),
        error: (error) => {
          this.captureFormError('services', error);
          this.serviceLoadError.set('No pudimos cargar los servicios.');
        },
      });
  }

  protected refresh(): void {
    this.loadingProcesses.set(true);
    this.listError.set(null);

    this.controlCenter
      .listProcesses(true)
      .pipe(finalize(() => this.loadingProcesses.set(false)), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => this.processes.set(data ?? []),
        error: (error) => this.listError.set(toUserFacingError(error)),
      });
  }

  protected onStart(): void {
    this.form.markAllAsTouched();
    if (!this.canStart()) return;

    const templateId = this.defaultTemplateId();
    if (!templateId) {
      this.notifications.warning('La configuración del flujo aún no está lista. Reintenta en un momento.');
      return;
    }

    this.starting.set(true);
    const { flowId, customerId, vehicleId, salesAgentId } = this.form.getRawValue();

    this.controlCenter
      .startProcess({
        processTemplateId: templateId,
        flowId,
        customerId,
        vehicleId,
        salesAgentId,
      })
      .pipe(finalize(() => this.starting.set(false)), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.resetForm();
          this.notifications.success('El flujo se inició correctamente. Puedes seguir su progreso en la bitácora.');
          this.dialogSnapshot.set(response);
          this.dialogProcessId.set(response.id);
          this.refresh();
        },
        error: () => {
          // El interceptor central ya muestra el mensaje amigable y deja el formulario listo para reintentar.
        },
      });
  }

  protected onDialogClosed(): void {
    this.dialogProcessId.set(null);
    this.dialogSnapshot.set(null);
    this.refresh();
  }

  protected viewProcess(id: string): void {
    this.dialogSnapshot.set(null);
    this.dialogProcessId.set(id);
  }

  private loadTemplate(): void {
    this.controlCenter
      .getDefaultTemplate(true)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (template) => this.defaultTemplateId.set(template?.id ?? null),
        error: (error) => {
          this.defaultTemplateId.set(null);
          this.captureFormError('template', error);
        },
      });
  }

  private captureFormError(source: FormDataset, error: unknown): UserFacingError {
    const friendly = toUserFacingError(error);
    if (!this.formDataError()) {
      this.formDataError.set(friendly);
    }
    return friendly;
  }

  private resetForm(): void {
    this.form.reset({
      flowId: DEFAULT_FLOW_ID,
      customerId: '',
      vehicleId: '',
      salesAgentId: '',
    });
  }

  private toArray<T>(response: unknown): T[] {
    if (Array.isArray(response)) {
      return response as T[];
    }
    if (response && Array.isArray((response as { data?: T[] }).data)) {
      return (response as { data: T[] }).data;
    }
    if (response && Array.isArray((response as { items?: T[] }).items)) {
      return (response as { items: T[] }).items;
    }
    return [];
  }
}
