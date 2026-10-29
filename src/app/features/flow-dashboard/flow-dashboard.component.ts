import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { catchError, finalize, forkJoin, map, of, startWith } from 'rxjs';
import { ControlCenterService } from '../../core/services/control-center.service';
import { OrchestratorService } from '../../core/services/orchestrator.service';
import { NotificationService } from '../../core/services/notification.service';
import { Vehicle } from '../../core/interfaces/vehicle.interface';
import { Agent } from '../../core/interfaces/agent.interface';
import { Customer } from '../../core/interfaces/customer.interface';
import { Service } from '../../core/interfaces/service.interface';
import { ProcessExecutionResponse } from '../../core/interfaces/process.models';

const DEFAULT_PAGE_SIZE = 10;
import { DEFAULT_FLOW_ID, FLOW_CATALOG } from '../../core/constants/flow-catalog';
import { UserFacingError } from '../../core/models/api-error.model';
import { toUserFacingError } from '../../core/interceptors/http-error.interceptor';
import { StatusBadgeComponent } from '../status-badge/status-badge.component';
import { SearchableSelectComponent } from '../../shared/searchable-select/searchable-select.component';
import { IconComponent } from '../../shared/icon/icon.component';
import { ProcessProgressDialogComponent } from '../process-progress-dialog/process-progress-dialog.component';
import { ErrorBannerComponent } from '../../shared/error-banner/error-banner.component';

/** Orígenes de datos del formulario que pueden fallar al cargarse. */
type FormDataset = 'template' | 'customers' | 'vehicles' | 'agents' | 'services';

/**
 * Selector `app-flow-dashboard`. Pantalla principal: inicia flujos con el formulario y lista las
 * ejecuciones paginadas, abriendo el diálogo de progreso; usa `ControlCenterService`,
 * `OrchestratorService` y `NotificationService`.
 */
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

  /** Opciones del catálogo de flujos disponibles para iniciar. */
  protected readonly flowOptions = FLOW_CATALOG.map((flow) => ({
    value: flow.id,
    label: flow.label,
  }));

  /** Formulario de inicio: flujo, cliente, vehículo y agente de ventas, todos obligatorios. */
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

  private readonly selectedFlowId = toSignal(
    this.form.controls.flowId.valueChanges.pipe(startWith(this.form.controls.flowId.value)),
    { initialValue: this.form.controls.flowId.value },
  );

  /** Ejecuciones de la página actual. */
  protected readonly processes = signal<ProcessExecutionResponse[]>([]);
  /** Índice de página solicitado, comenzando en cero. */
  protected readonly pageIndex = signal(0);
  /** Tamaño de página fijo de la lista de ejecuciones. */
  protected readonly pageSize = DEFAULT_PAGE_SIZE;
  /** Total de páginas informado por el backend. */
  protected readonly totalPages = signal(0);
  /** Total de ejecuciones informado por el backend. */
  protected readonly totalElements = signal(0);
  /** Indica si hay un inicio de flujo en curso. */
  protected readonly starting = signal(false);
  /** Indica si la lista de ejecuciones se está cargando. */
  protected readonly loadingProcesses = signal(false);
  /** Error amigable al cargar la lista de ejecuciones. */
  protected readonly listError = signal<UserFacingError | null>(null);
  /** Primer error amigable al cargar los datos del formulario. */
  protected readonly formDataError = signal<UserFacingError | null>(null);

  private readonly templateIdByFlowId = signal<ReadonlyMap<string, string>>(new Map());
  private readonly flowLabelByTemplateId = signal<ReadonlyMap<string, string>>(new Map());
  /** Indica si se están resolviendo las plantillas de los flujos. */
  protected readonly templateLoading = signal(false);
  /** Aviso cuando no se pudo resolver la plantilla de algún flujo. */
  protected readonly templateError = signal<string | null>(null);

  /** Id de plantilla del flujo seleccionado, o `null` si aún no está disponible. */
  protected readonly selectedTemplateId = computed(
    () => this.templateIdByFlowId().get(this.selectedFlowId()) ?? null,
  );

  /** Id del proceso mostrado en el diálogo; `null` cuando está cerrado. */
  protected readonly dialogProcessId = signal<string | null>(null);
  /** Indica si el diálogo de progreso debe mostrarse. */
  protected readonly isDialogOpen = computed(() => this.dialogProcessId() !== null);
  private readonly dialogSnapshot = signal<ProcessExecutionResponse | null>(null);

  /** Clientes activos disponibles para el formulario. */
  protected readonly customers = signal<Customer[]>([]);
  /** Vehículos disponibles para el formulario. */
  protected readonly vehicles = signal<Vehicle[]>([]);
  /** Agentes de ventas activos para el formulario. */
  protected readonly agents = signal<Agent[]>([]);
  /** Servicios de venta activos para el formulario. */
  protected readonly services = signal<Service[]>([]);

  /** Indicadores de carga de cada conjunto de datos del formulario. */
  protected readonly loadingCustomers = signal(false);
  protected readonly loadingVehicles = signal(false);
  protected readonly loadingAgents = signal(false);
  protected readonly loadingServices = signal(false);

  /** Errores de carga independientes por conjunto de datos del formulario. */
  protected readonly customerLoadError = signal<string | null>(null);
  protected readonly vehicleLoadError = signal<string | null>(null);
  protected readonly agentLoadError = signal<string | null>(null);
  protected readonly serviceLoadError = signal<string | null>(null);

  /** Opciones de cliente con nombre, correo e identificación como texto de búsqueda. */
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

  /** Nombre del cliente para mostrar en la lista; cae al id si no está cargado. */
  protected customerNameFor(customerId?: string | null): string {
    if (!customerId) return '—';
    return this.customerNameById().get(customerId) ?? customerId;
  }

  /** Proceso mostrado en el diálogo: se busca en la lista y, si no está, se usa el snapshot del inicio. */
  protected readonly dialogProcess = computed(() => {
    const id = this.dialogProcessId();
    if (!id) return null;
    return this.processes().find((process) => process.id === id) ?? this.dialogSnapshot();
  });

  /** Nombre del cliente del proceso abierto en el diálogo. */
  protected readonly dialogCustomerName = computed(() => {
    const customerId = this.dialogProcess()?.customerId;
    return customerId ? this.customerNameById().get(customerId) ?? null : null;
  });

  /** Etiqueta del flujo correspondiente a la plantilla del proceso abierto en el diálogo. */
  protected readonly dialogTemplateName = computed(() => {
    const templateId = this.dialogProcess()?.processTemplateId;
    return templateId ? this.flowLabelByTemplateId().get(templateId) ?? null : null;
  });

  /** Etiqueta del flujo a partir del id de plantilla; devuelve "—" si no se conoce. */
  protected flowLabelFor(templateId?: string | null): string {
    if (!templateId) return '—';
    return this.flowLabelByTemplateId().get(templateId) ?? '—';
  }

  /** Opciones de vehículo disponibles, con marca, modelo y precio. */
  protected readonly vehicleOptions = computed(() =>
    this.vehicles()
      .filter((vehicle) => vehicle.available === true)
      .map((vehicle) => ({
        value: vehicle.vehicle_id,
        label: `${vehicle.brand} ${vehicle.model} - $${vehicle.price.toLocaleString()}`,
        searchText: `${vehicle.brand} ${vehicle.model}`,
      })),
  );

  /** Opciones de agente activo especializado en ventas de autos nuevos o usados. */
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

  /** Opciones de servicio activo de ventas, finanzas o seguros. */
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

  /** Habilita el inicio solo con formulario válido, plantilla resuelta y sin operación en curso. */
  protected readonly canStart = computed(
    () =>
      this.formStatus() === 'VALID' &&
      !this.starting() &&
      !this.templateLoading() &&
      this.selectedTemplateId() !== null,
  );

  /** Mensaje que explica por qué no se puede iniciar el flujo; vacío si todo está listo. */
  protected readonly startHint = computed(() => {
    if (this.starting()) return '';
    if (this.templateLoading()) {
      return 'Cargando la configuración de los flujos…';
    }
    if (this.selectedTemplateId() === null) {
      return 'La plantilla de este flujo no está disponible. Elige otro flujo o reintenta la carga.';
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

  /** Resuelve plantillas y carga clientes, vehículos, agentes y servicios para el formulario. */
  protected loadFormData(): void {
    this.formDataError.set(null);
    this.loadTemplates();

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

  /** Carga la página actual de ejecuciones y actualiza los totales de paginación. */
  protected refresh(): void {
    this.loadingProcesses.set(true);
    this.listError.set(null);

    this.controlCenter
      .listProcesses(this.pageIndex(), this.pageSize, true)
      .pipe(finalize(() => this.loadingProcesses.set(false)), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (page) => {
          this.processes.set(page?.content ?? []);
          this.totalPages.set(page?.totalPages ?? 0);
          this.totalElements.set(page?.totalElements ?? 0);
        },
        error: (error) => this.listError.set(toUserFacingError(error)),
      });
  }

  /** Retrocede una página si no está en la primera y recarga la lista. */
  protected goToPreviousPage(): void {
    if (this.pageIndex() === 0) return;
    this.pageIndex.update((page) => page - 1);
    this.refresh();
  }

  /** Avanza una página si quedan páginas pendientes y recarga la lista. */
  protected goToNextPage(): void {
    if (this.pageIndex() + 1 >= this.totalPages()) return;
    this.pageIndex.update((page) => page + 1);
    this.refresh();
  }

  /** Inicia el flujo con los datos del formulario, abre el diálogo y vuelve a la primera página. */
  protected onStart(): void {
    this.form.markAllAsTouched();
    if (!this.canStart()) return;

    const templateId = this.selectedTemplateId();
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
          this.pageIndex.set(0);
          this.refresh();
        },
        error: () => {
          // El interceptor central ya muestra el mensaje amigable y deja el formulario listo para reintentar.
        },
      });
  }

  /** Limpia el proceso del diálogo y refresca la lista al cerrarlo. */
  protected onDialogClosed(): void {
    this.dialogProcessId.set(null);
    this.dialogSnapshot.set(null);
    this.refresh();
  }

  /** Abre el diálogo de progreso para una ejecución existente de la lista. */
  protected viewProcess(id: string): void {
    this.dialogSnapshot.set(null);
    this.dialogProcessId.set(id);
  }

  /** Resuelve el id de plantilla y la etiqueta de cada flujo del catálogo en paralelo. */
  private loadTemplates(): void {
    this.templateLoading.set(true);
    this.templateError.set(null);

    const requests = FLOW_CATALOG.map((flow) =>
      this.controlCenter.getTemplateByName(flow.templateName, true).pipe(
        map((template) => ({ flow, templateId: template?.id ?? null })),
        catchError((error) => {
          this.captureFormError('template', error);
          return of({ flow, templateId: null });
        }),
      ),
    );

    forkJoin(requests)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((results) => {
        const templateIdByFlowId = new Map<string, string>();
        const flowLabelByTemplateId = new Map<string, string>();
        let missingTemplate = false;

        for (const { flow, templateId } of results) {
          if (!templateId) {
            missingTemplate = true;
            continue;
          }
          templateIdByFlowId.set(flow.id, templateId);
          flowLabelByTemplateId.set(templateId, flow.label);
        }

        this.templateIdByFlowId.set(templateIdByFlowId);
        this.flowLabelByTemplateId.set(flowLabelByTemplateId);
        this.templateError.set(
          missingTemplate ? 'No pudimos resolver la plantilla de uno de los flujos.' : null,
        );
        this.templateLoading.set(false);
      });
  }

  /** Guarda el primer error del formulario y devuelve su versión amigable. */
  private captureFormError(source: FormDataset, error: unknown): UserFacingError {
    const friendly = toUserFacingError(error);
    if (!this.formDataError()) {
      this.formDataError.set(friendly);
    }
    return friendly;
  }

  /** Restablece el formulario a sus valores iniciales tras iniciar un flujo. */
  private resetForm(): void {
    this.form.reset({
      flowId: DEFAULT_FLOW_ID,
      customerId: '',
      vehicleId: '',
      salesAgentId: '',
    });
  }

  /** Normaliza respuestas de listado que pueden venir como arreglo, `data` o `items`. */
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
