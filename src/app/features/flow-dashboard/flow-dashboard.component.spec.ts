import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { of, Subject, throwError } from 'rxjs';
import { FlowDashboardComponent } from './flow-dashboard.component';
import { ControlCenterService } from '../../core/services/control-center.service';
import { OrchestratorService } from '../../core/services/orchestrator.service';
import { NotificationService } from '../../core/services/notification.service';
import { FlowSseService } from '../../core/services/flow-sse.service';
import { ProcessExecutionPage, ProcessExecutionResponse } from '../../core/interfaces/process.models';
import { FLOW_CATALOG } from '../../core/constants/flow-catalog';

const TEMPLATE_IDS: Record<string, string> = {
  'Compra de vehiculo': 'tpl-1',
  'Compra con financiamiento': 'tpl-fin',
  'Apartado de vehiculo': 'tpl-ap',
};

function httpError(message: string, status = 422, flowCode = 'FLOW-01'): HttpErrorResponse {
  return new HttpErrorResponse({
    status,
    statusText: 'Unprocessable Entity',
    error: { message, flowCode },
  });
}

function makeProcess(id = 'p1'): ProcessExecutionResponse {
  return {
    id,
    processTemplateId: 'tpl-1',
    customerId: 'c1',
    status: 'IN_PROGRESS',
    steps: [],
  };
}

function makePage(
  content: ProcessExecutionResponse[] = [makeProcess()],
  overrides: Partial<ProcessExecutionPage> = {},
): ProcessExecutionPage {
  return {
    content,
    page: 0,
    size: 10,
    totalElements: content.length,
    totalPages: content.length ? 1 : 0,
    ...overrides,
  };
}

function findButton(root: HTMLElement, text: string): HTMLButtonElement | undefined {
  return Array.from<HTMLButtonElement>(root.querySelectorAll('button')).find((button) =>
    button.textContent?.includes(text),
  );
}

describe('FlowDashboardComponent', () => {
  let fixture: ComponentFixture<FlowDashboardComponent>;
  let component: FlowDashboardComponent;
  let controlCenter: Record<string, jest.Mock>;
  let orchestrator: Record<string, jest.Mock>;
  let notifications: NotificationService;

  const sseMock = {
    flowEvents: signal([]),
    isConnected: signal(false),
    isReconnecting: signal(false),
    error: signal<string | null>(null),
    connect: jest.fn(),
    clear: jest.fn(),
    disconnect: jest.fn(),
    reconnect: jest.fn(),
  };

  beforeEach(() => {
    controlCenter = {
      getDefaultTemplate: jest.fn(() => of({ id: 'tpl-1' })),
      getTemplateByName: jest.fn((name: string) => of({ id: TEMPLATE_IDS[name] ?? 'tpl-1' })),
      listProcesses: jest.fn(() => of(makePage())),
      startProcess: jest.fn(() => of(makeProcess('p-new'))),
      getProcess: jest.fn(() => of(makeProcess())),
      getProcessSteps: jest.fn(() => of([])),
      listInterventions: jest.fn(() => of([])),
      retryProcess: jest.fn(() => of(makeProcess())),
      retryStep: jest.fn(() => of(makeProcess())),
      resumeIntervention: jest.fn(() => of({ id: 'i1' })),
    };
    orchestrator = {
      getActiveCustomers: jest.fn(() =>
        of([
          {
            id: 'c1',
            fullName: 'Ana Torres',
            email: 'ana@example.com',
            identificationNumber: '123',
            isActive: true,
            createdAt: '',
            updatedAt: '',
          },
        ]),
      ),
      getAvailableVehicles: jest.fn(() =>
        of({
          data: [
            {
              available: true,
              brand: 'Toyota',
              currency: 'MXN',
              model: 'Corolla',
              model_id: 'm1',
              price: 250000,
              vehicle_id: 'v1',
            },
            {
              available: false,
              brand: 'Ford',
              currency: 'MXN',
              model: 'Fiesta',
              model_id: 'm2',
              price: 150000,
              vehicle_id: 'v2',
            },
          ],
        }),
      ),
      getSalesAgents: jest.fn(() =>
        of({
          items: [
            {
              id: 'a1',
              fullName: 'Luis Vega',
              email: 'luis@example.com',
              licenseNumber: 'L-1',
              isActive: true,
              specialization: 'VENTAS_NUEVOS',
            },
            {
              id: 'a2',
              fullName: 'Marta Ruiz',
              email: 'marta@example.com',
              licenseNumber: 'L-2',
              isActive: false,
              specialization: 'VENTAS_NUEVOS',
            },
            {
              id: 'a3',
              fullName: 'Pedro Gil',
              email: 'pedro@example.com',
              licenseNumber: 'L-3',
              isActive: true,
              specialization: 'SERVICIO',
            },
          ],
        }),
      ),
      getSalesServices: jest.fn(() =>
        of({
          data: [
            {
              id: 's1',
              code: 'S-1',
              name: 'Seguro',
              basePrice: 5000,
              isActive: true,
              category: 'VENTAS',
              createdAt: '',
              updatedAt: '',
            },
            {
              id: 's2',
              code: 'S-2',
              name: 'Lavado',
              basePrice: 300,
              isActive: true,
              category: 'MANTENIMIENTO',
              createdAt: '',
              updatedAt: '',
            },
          ],
        }),
      ),
    };
    TestBed.configureTestingModule({
      imports: [FlowDashboardComponent],
      providers: [
        { provide: ControlCenterService, useValue: controlCenter },
        { provide: OrchestratorService, useValue: orchestrator },
        { provide: FlowSseService, useValue: sseMock },
      ],
    });
    fixture = TestBed.createComponent(FlowDashboardComponent);
    component = fixture.componentInstance;
    notifications = TestBed.inject(NotificationService);
  });

  function fillForm(): void {
    const form = (component as unknown as { form: { controls: Record<string, { setValue: (value: string) => void }> } }).form;
    form.controls['customerId'].setValue('c1');
    form.controls['vehicleId'].setValue('v1');
    form.controls['salesAgentId'].setValue('a1');
    fixture.detectChanges();
  }

  it('carga la plantilla de cada flujo y los catálogos del formulario', () => {
    fixture.detectChanges();

    expect(controlCenter['getTemplateByName']).toHaveBeenCalledTimes(FLOW_CATALOG.length);
    expect(controlCenter['getTemplateByName']).toHaveBeenCalledWith('Compra de vehiculo', true);
    expect(controlCenter['getTemplateByName']).toHaveBeenCalledWith('Compra con financiamiento', true);
    expect(controlCenter['getTemplateByName']).toHaveBeenCalledWith('Apartado de vehiculo', true);
    expect(controlCenter['getDefaultTemplate']).not.toHaveBeenCalled();
    expect(orchestrator['getActiveCustomers']).toHaveBeenCalledWith(true);
    expect(orchestrator['getAvailableVehicles']).toHaveBeenCalledWith(true);
    expect(orchestrator['getSalesAgents']).toHaveBeenCalledWith(true);
    expect(orchestrator['getSalesServices']).toHaveBeenCalledWith(true);
    expect(controlCenter['listProcesses']).toHaveBeenCalledWith(0, 10, true);
    expect(fixture.nativeElement.textContent).toContain('p1');
    expect(fixture.nativeElement.textContent).toContain('Ana Torres');
  });

  it('ofrece los flujos disponibles en un selector', () => {
    fixture.detectChanges();

    const dashboard = component as unknown as {
      flowOptions: { value: string; label: string }[];
    };

    expect(dashboard.flowOptions).toEqual(
      FLOW_CATALOG.map((flow) => ({ value: flow.id, label: flow.label })),
    );
    expect(fixture.nativeElement.textContent).toContain('Compra de vehículo');
  });

  it('filtra vehículos, agentes y servicios disponibles', () => {
    fixture.detectChanges();

    const options = component as unknown as {
      vehicleOptions: () => unknown[];
      agentOptions: () => unknown[];
      serviceOptions: () => unknown[];
    };

    expect(options.vehicleOptions()).toHaveLength(1);
    expect(options.agentOptions()).toHaveLength(1);
    expect(options.serviceOptions()).toHaveLength(1);
  });

  it('habilita el inicio solo cuando el formulario está completo y hay plantilla', () => {
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Completa todos los campos para iniciar el flujo');
    expect(findButton(fixture.nativeElement, 'Iniciar flujo')?.disabled).toBe(true);

    fillForm();

    expect(findButton(fixture.nativeElement, 'Iniciar flujo')?.disabled).toBe(false);
    expect(fixture.nativeElement.textContent).not.toContain('Completa todos los campos');
  });

  it('inicia el flujo con la plantilla del flujo seleccionado y abre el progreso', () => {
    fixture.detectChanges();
    fillForm();

    findButton(fixture.nativeElement, 'Iniciar flujo')!.click();
    fixture.detectChanges();

    expect(controlCenter['startProcess']).toHaveBeenCalledWith({
      processTemplateId: 'tpl-1',
      flowId: 'compra-vehiculo',
      customerId: 'c1',
      vehicleId: 'v1',
      salesAgentId: 'a1',
    });
    expect(notifications.toasts().some((toast) => toast.tone === 'success')).toBe(true);

    const dialog = fixture.nativeElement.querySelector('app-process-progress-dialog') as HTMLElement;
    expect(dialog).not.toBeNull();
    expect(dialog.textContent).toContain('Ana Torres');
    expect(dialog.textContent).toContain('Compra de vehículo');
  });

  it('inicia el flujo de financiamiento con su propia plantilla', () => {
    fixture.detectChanges();
    fillForm();

    const form = (component as unknown as {
      form: { controls: Record<string, { setValue: (value: string) => void }> };
    }).form;
    form.controls['flowId'].setValue('compra-financiamiento');
    fixture.detectChanges();

    findButton(fixture.nativeElement, 'Iniciar flujo')!.click();

    expect(controlCenter['startProcess']).toHaveBeenCalledWith({
      processTemplateId: 'tpl-fin',
      flowId: 'compra-financiamiento',
      customerId: 'c1',
      vehicleId: 'v1',
      salesAgentId: 'a1',
    });
  });

  it('muestra el flujo de cada ejecución en la lista', () => {
    fixture.detectChanges();

    const flowCell = fixture.nativeElement.querySelector('tbody tr td:nth-child(2)') as HTMLElement | null;
    expect(flowCell?.textContent).toContain('Compra de vehículo');
  });

  it('informa el estado de carga mientras inicia el flujo', () => {
    const pending = new Subject<ProcessExecutionResponse>();
    controlCenter['startProcess'].mockReturnValue(pending.asObservable());
    fixture.detectChanges();
    fillForm();

    findButton(fixture.nativeElement, 'Iniciar flujo')!.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Iniciando…');
    expect(fixture.nativeElement.querySelector('button[type="submit"] app-icon.animate-spin')).not.toBeNull();

    pending.complete();
  });

  it('no inicia el flujo cuando la plantilla no está disponible', () => {
    controlCenter['getTemplateByName'].mockReturnValue(throwError(() => httpError('Sin plantilla.', 500)));
    fixture.detectChanges();
    fillForm();

    expect(fixture.nativeElement.textContent).toContain(
      'La plantilla de este flujo no está disponible',
    );
    findButton(fixture.nativeElement, 'Iniciar flujo')!.click();

    expect(controlCenter['startProcess']).not.toHaveBeenCalled();
  });

  it('muestra el mensaje amigable del backend cuando falla la carga de catálogos y permite reintentar', () => {
    controlCenter['getTemplateByName'].mockReturnValue(throwError(() => httpError('No pudimos cargar el flujo.', 409, 'CC-409')));
    orchestrator['getActiveCustomers'].mockReturnValue(throwError(() => httpError('No pudimos cargar los clientes.')));
    fixture.detectChanges();

    const content = fixture.nativeElement.textContent;
    expect(content).toContain('No pudimos cargar los datos del formulario');
    expect(content).toContain('No pudimos cargar los clientes.');
    expect(content).toContain('CC-409');
    expect(content).toContain('Reintentar carga');

    findButton(fixture.nativeElement, 'Reintentar carga')!.click();

    expect(controlCenter['getTemplateByName']).toHaveBeenCalledTimes(FLOW_CATALOG.length * 2);
  });

  it('muestra el error de la lista de ejecuciones y la recarga con el botón de reintento', () => {
    controlCenter['listProcesses'].mockReturnValue(throwError(() => httpError('No pudimos listar las ejecuciones.', 503, 'CC-503')));
    fixture.detectChanges();

    const content = fixture.nativeElement.textContent;
    expect(content).toContain('No pudimos cargar las ejecuciones');
    expect(content).toContain('No pudimos listar las ejecuciones.');
    expect(content).toContain('CC-503');

    controlCenter['listProcesses'].mockReturnValue(of(makePage([])));
    findButton(fixture.nativeElement, 'Reintentar')!.click();
    fixture.detectChanges();

    expect(controlCenter['listProcesses']).toHaveBeenCalledTimes(2);
    expect(fixture.nativeElement.textContent).toContain('No hay ejecuciones todavía');
  });

  it('pagina las ejecuciones y navega entre páginas', () => {
    controlCenter['listProcesses'].mockReturnValue(
      of(makePage([makeProcess('p1')], { totalElements: 25, totalPages: 3 })),
    );
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Página 1 de 3 · 25 ejecuciones');
    expect(findButton(fixture.nativeElement, 'Anterior')!.disabled).toBe(true);
    expect(findButton(fixture.nativeElement, 'Siguiente')!.disabled).toBe(false);

    findButton(fixture.nativeElement, 'Siguiente')!.click();
    fixture.detectChanges();

    expect(controlCenter['listProcesses']).toHaveBeenCalledWith(1, 10, true);
    expect(fixture.nativeElement.textContent).toContain('Página 2 de 3');
    expect(findButton(fixture.nativeElement, 'Anterior')!.disabled).toBe(false);

    findButton(fixture.nativeElement, 'Anterior')!.click();
    fixture.detectChanges();

    expect(controlCenter['listProcesses']).toHaveBeenLastCalledWith(0, 10, true);
  });

  it('deshabilita el avance en la última página', () => {
    controlCenter['listProcesses'].mockReturnValue(
      of(makePage([makeProcess('p1')], { totalElements: 11, totalPages: 2 })),
    );
    fixture.detectChanges();

    findButton(fixture.nativeElement, 'Siguiente')!.click();
    fixture.detectChanges();

    expect(controlCenter['listProcesses']).toHaveBeenCalledWith(1, 10, true);
    expect(findButton(fixture.nativeElement, 'Siguiente')!.disabled).toBe(true);
  });

  it('oculta la navegación cuando hay una sola página', () => {
    fixture.detectChanges();

    expect(findButton(fixture.nativeElement, 'Siguiente')).toBeUndefined();
    expect(findButton(fixture.nativeElement, 'Anterior')).toBeUndefined();
    expect(fixture.nativeElement.textContent).not.toContain('Página 1 de 1');
  });

  it('abre el detalle de una ejecución en el diálogo sin navegar a otra página', () => {
    fixture.detectChanges();

    findButton(fixture.nativeElement, 'Ver detalle')!.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-process-progress-dialog')).not.toBeNull();
    expect(controlCenter['getProcess']).toHaveBeenCalledWith('p1', true);

    const dialog = fixture.nativeElement.querySelector('app-process-progress-dialog') as HTMLElement;
    expect(dialog.textContent).toContain('Ana Torres');
    expect(dialog.textContent).toContain('Compra de vehículo');
  });

  it('informa los errores de cada catálogo del formulario', () => {
    orchestrator['getAvailableVehicles'].mockReturnValue(
      throwError(() => httpError('No pudimos cargar los vehículos.')),
    );
    orchestrator['getSalesAgents'].mockReturnValue(
      throwError(() => httpError('No pudimos cargar los agentes.')),
    );
    orchestrator['getSalesServices'].mockReturnValue(
      throwError(() => httpError('No pudimos cargar los servicios.')),
    );
    fixture.detectChanges();

    const content = fixture.nativeElement.textContent;
    expect(content).toContain('No pudimos cargar los vehículos.');
    expect(content).toContain('No pudimos cargar los agentes.');
    expect(content).toContain('No pudimos cargar los servicios.');
  });

  it('tolera respuestas de catálogo sin estructura esperada', () => {
    orchestrator['getActiveCustomers'].mockReturnValue(of({ unexpected: true }));
    fixture.detectChanges();

    const options = component as unknown as { customerOptions: () => unknown[] };
    expect(options.customerOptions()).toEqual([]);
    expect(fixture.nativeElement.textContent).toContain('Iniciar flujo');
  });

  it('mantiene el formulario disponible si el inicio falla', () => {
    controlCenter['startProcess'].mockReturnValue(
      throwError(() => httpError('El cliente ya tiene un proceso activo.', 409, 'CC-409')),
    );
    fixture.detectChanges();
    fillForm();

    findButton(fixture.nativeElement, 'Iniciar flujo')!.click();
    fixture.detectChanges();

    expect(controlCenter['startProcess']).toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('app-process-progress-dialog')).toBeNull();
    expect(findButton(fixture.nativeElement, 'Iniciar flujo')?.disabled).toBe(false);
  });

  it('refresca y cierra el progreso al cerrar el diálogo', () => {
    fixture.detectChanges();
    fillForm();
    findButton(fixture.nativeElement, 'Iniciar flujo')!.click();
    fixture.detectChanges();

    const close = fixture.nativeElement.querySelector(
      'app-process-progress-dialog button[aria-label="Cerrar"]',
    ) as HTMLButtonElement;
    close.click();
    fixture.detectChanges();

    expect(controlCenter['listProcesses']).toHaveBeenCalledTimes(3);
    expect(fixture.nativeElement.querySelector('app-process-progress-dialog')).toBeNull();
  });
});
