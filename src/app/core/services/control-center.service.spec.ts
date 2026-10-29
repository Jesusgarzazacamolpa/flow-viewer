import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ControlCenterService } from './control-center.service';
import { SILENT_ERROR_TOAST } from '../interceptors/http-error.interceptor';

describe('ControlCenterService', () => {
  let service: ControlCenterService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ControlCenterService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('obtiene la plantilla por defecto, opcionalmente en modo silencioso', () => {
    service.getDefaultTemplate().subscribe();
    const normal = httpMock.expectOne('/api/process-templates/default');
    expect(normal.request.context.get(SILENT_ERROR_TOAST)).toBe(false);
    normal.flush({ id: 'tpl-1' });

    service.getDefaultTemplate(true).subscribe();
    const silent = httpMock.expectOne('/api/process-templates/default');
    expect(silent.request.context.get(SILENT_ERROR_TOAST)).toBe(true);
    silent.flush({ id: 'tpl-2' });
  });

  it('resuelve la plantilla por nombre, opcionalmente en modo silencioso', () => {
    service.getTemplateByName('Apartado de vehiculo').subscribe();
    const normal = httpMock.expectOne((request) => request.url === '/api/process-templates/by-name');
    expect(normal.request.params.get('name')).toBe('Apartado de vehiculo');
    expect(normal.request.context.get(SILENT_ERROR_TOAST)).toBe(false);
    normal.flush({ id: 'tpl-ap' });

    service.getTemplateByName('Compra con financiamiento', true).subscribe();
    const silent = httpMock.expectOne((request) => request.url === '/api/process-templates/by-name');
    expect(silent.request.params.get('name')).toBe('Compra con financiamiento');
    expect(silent.request.context.get(SILENT_ERROR_TOAST)).toBe(true);
    silent.flush({ id: 'tpl-fin' });
  });

  it('inicia el proceso con valores por defecto y permite sobrescribirlos', () => {
    service.startProcess({ processTemplateId: 'tpl-1' }).subscribe();
    const defaults = httpMock.expectOne('/api/processes/start');
    expect(defaults.request.method).toBe('POST');
    expect(defaults.request.body).toEqual({
      processTemplateId: 'tpl-1',
      customerId: 'customer-001',
      vehicleId: 'vehicle-123',
      salesAgentId: 'agent-77',
      flowId: 'compra-vehiculo',
    });
    defaults.flush({});

    service
      .startProcess({
        processTemplateId: 'tpl-2',
        flowId: 'otro-flujo',
        customerId: 'c-1',
        vehicleId: 'v-1',
        salesAgentId: 'a-1',
      })
      .subscribe();
    const custom = httpMock.expectOne('/api/processes/start');
    expect(custom.request.body.flowId).toBe('otro-flujo');
    expect(custom.request.body.customerId).toBe('c-1');
    custom.flush({});
  });

  it('consulta procesos y pasos', () => {
    service.listProcesses(0, 10, true).subscribe();
    const list = httpMock.expectOne((request) => request.url === '/api/processes');
    expect(list.request.params.get('page')).toBe('0');
    expect(list.request.params.get('size')).toBe('10');
    expect(list.request.context.get(SILENT_ERROR_TOAST)).toBe(true);
    list.flush({ content: [], page: 0, size: 10, totalElements: 0, totalPages: 0 });

    service.getProcess('p1', true).subscribe();
    httpMock.expectOne('/api/processes/p1').flush({});

    service.getProcessSteps('p1', true).subscribe();
    httpMock.expectOne('/api/processes/p1/steps').flush([]);
  });

  it('usa el manejo global de errores por defecto', () => {
    service.listProcesses(2, 25).subscribe();
    const list = httpMock.expectOne((request) => request.url === '/api/processes');
    expect(list.request.params.get('page')).toBe('2');
    expect(list.request.params.get('size')).toBe('25');
    expect(list.request.context.get(SILENT_ERROR_TOAST)).toBe(false);
    list.flush({ content: [], page: 2, size: 25, totalElements: 0, totalPages: 0 });

    service.getProcess('p1').subscribe();
    const process = httpMock.expectOne('/api/processes/p1');
    expect(process.request.context.get(SILENT_ERROR_TOAST)).toBe(false);
    process.flush({});

    service.getProcessSteps('p1').subscribe();
    const steps = httpMock.expectOne('/api/processes/p1/steps');
    expect(steps.request.context.get(SILENT_ERROR_TOAST)).toBe(false);
    steps.flush([]);

    service.listInterventions().subscribe();
    const interventions = httpMock.expectOne('/api/interventions');
    expect(interventions.request.params.has('status')).toBe(false);
    expect(interventions.request.context.get(SILENT_ERROR_TOAST)).toBe(false);
    interventions.flush([]);

    service.getIntervention('i1', true).subscribe();
    const intervention = httpMock.expectOne('/api/interventions/i1');
    expect(intervention.request.context.get(SILENT_ERROR_TOAST)).toBe(true);
    intervention.flush({});
  });

  it('reintenta el proceso con entrada del usuario como parámetro', () => {
    service.retryProcess('p1', 'factura-123').subscribe();
    const req = httpMock.expectOne((request) => request.url === '/api/processes/p1/retry');
    expect(req.request.method).toBe('POST');
    expect(req.request.params.get('userInput')).toBe('factura-123');
    req.flush({});
  });

  it('reintenta un paso específico', () => {
    service.retryStep('p1', 3).subscribe();
    const req = httpMock.expectOne('/api/processes/p1/steps/3/retry');
    expect(req.request.method).toBe('POST');
    req.flush({});
  });

  it('lista y actualiza intervenciones', () => {
    service.listInterventions({ status: 'PENDING' }, true).subscribe();
    const list = httpMock.expectOne((request) => request.url === '/api/interventions');
    expect(list.request.params.get('status')).toBe('PENDING');
    expect(list.request.params.has('processId')).toBe(false);
    expect(list.request.context.get(SILENT_ERROR_TOAST)).toBe(true);
    list.flush([]);

    service.getIntervention('i1').subscribe();
    httpMock.expectOne('/api/interventions/i1').flush({});

    service.updateIntervention('i1', { status: 'APPROVED', notes: 'ok' }).subscribe();
    const update = httpMock.expectOne('/api/interventions/i1');
    expect(update.request.method).toBe('PUT');
    expect(update.request.body).toEqual({ status: 'APPROVED', notes: 'ok' });
    update.flush({});

    service.assignIntervention('i1', 'ana').subscribe();
    const assign = httpMock.expectOne('/api/interventions/i1/assign');
    expect(assign.request.method).toBe('PATCH');
    expect(assign.request.body).toEqual({ assignee: 'ana' });
    assign.flush({});
  });

  it('filtra las intervenciones por proceso y estado en el servidor', () => {
    service
      .listInterventions({ processId: 'p1', status: 'PENDING_REVIEW' }, true)
      .subscribe();
    const req = httpMock.expectOne((request) => request.url === '/api/interventions');
    expect(req.request.params.get('processId')).toBe('p1');
    expect(req.request.params.get('status')).toBe('PENDING_REVIEW');
    req.flush([]);
  });

  it('reanuda una intervención con estado APPROVED', () => {
    service.resumeIntervention('i1').subscribe();
    const req = httpMock.expectOne('/api/interventions/i1');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body.status).toBe('APPROVED');
    req.flush({});
  });

  it('rechaza una intervención con estado REJECTED', () => {
    service.rejectIntervention('i1', 'Datos fiscales inválidos').subscribe();
    const req = httpMock.expectOne('/api/interventions/i1');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ status: 'REJECTED', notes: 'Datos fiscales inválidos' });
    req.flush({});
  });
});
