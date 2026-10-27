import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { OrchestratorService } from './orchestrator.service';
import { SILENT_ERROR_TOAST } from '../interceptors/http-error.interceptor';

describe('OrchestratorService', () => {
  let service: OrchestratorService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(OrchestratorService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('consulta vehículos con filtros de paginación', () => {
    service
      .getVehicles({ page: 1, pageSize: 10, status: 'AVAILABLE', search: 'toyota' })
      .subscribe();

    const req = httpMock.expectOne((request) => request.url === '/api/orchestrator/vehicles');
    expect(req.request.params.get('page')).toBe('1');
    expect(req.request.params.get('pageSize')).toBe('10');
    expect(req.request.params.get('status')).toBe('AVAILABLE');
    expect(req.request.params.get('search')).toBe('toyota');
    req.flush({ items: [], total: 0, page: 1, pageSize: 10, totalPages: 0 });
  });

  it('carga vehículos disponibles en modo silencioso', () => {
    service.getAvailableVehicles(true).subscribe();
    const req = httpMock.expectOne('/api/orchestrator/vehicles/available');
    expect(req.request.context.get(SILENT_ERROR_TOAST)).toBe(true);
    req.flush({ data: [], success: true });
  });

  it('incluye isActive=false en la consulta de agentes', () => {
    service.getAgents({ isActive: false, specialization: 'VENTAS_NUEVOS' }).subscribe();
    const req = httpMock.expectOne((request) => request.url === '/api/orchestrator/agents');
    expect(req.request.params.get('isActive')).toBe('false');
    expect(req.request.params.get('specialization')).toBe('VENTAS_NUEVOS');
    req.flush({ items: [], total: 0, page: 0, pageSize: 0, totalPages: 0 });
  });

  it('consulta agentes activos y de ventas', () => {
    service.getActiveAgents().subscribe();
    httpMock.expectOne('/api/orchestrator/agents/active').flush([]);

    service.getSalesAgents(true).subscribe();
    const sales = httpMock.expectOne('/api/orchestrator/agents/specialization/VENTAS_NUEVOS');
    expect(sales.request.context.get(SILENT_ERROR_TOAST)).toBe(true);
    sales.flush({ data: [], success: true });
  });

  it('consulta clientes con filtros y búsqueda codificada', () => {
    service.getCustomers({ page: 2, isActive: true, search: 'Ana' }).subscribe();
    const req = httpMock.expectOne((request) => request.url === '/api/orchestrator/customers');
    expect(req.request.params.get('page')).toBe('2');
    expect(req.request.params.get('isActive')).toBe('true');
    expect(req.request.params.get('search')).toBe('Ana');
    req.flush({ items: [], total: 0, page: 2, pageSize: 0, totalPages: 0 });

    service.getActiveCustomers(true).subscribe();
    httpMock.expectOne('/api/orchestrator/customers/active').flush({ data: [], success: true });

    service.searchCustomers('Ana María').subscribe();
    const search = httpMock.expectOne((request) => request.url === '/api/orchestrator/customers/search');
    expect(search.request.params.get('name')).toBe('Ana María');
    search.flush([]);
  });

  it('consulta servicios con filtros y listados activos', () => {
    service.getServices({ category: 'VENTAS', isActive: true }).subscribe();
    const req = httpMock.expectOne((request) => request.url === '/api/orchestrator/services');
    expect(req.request.params.get('category')).toBe('VENTAS');
    expect(req.request.params.get('isActive')).toBe('true');
    req.flush({ items: [], total: 0, page: 0, pageSize: 0, totalPages: 0 });

    service.getActiveServices().subscribe();
    httpMock.expectOne('/api/orchestrator/services/active').flush([]);

    service.getSalesServices(true).subscribe();
    httpMock.expectOne('/api/orchestrator/services/sales').flush({ data: [], success: true });
  });

  it('propaga el modo silencioso en todos los catálogos', () => {
    const calls: Array<{ run: () => void; url: string; body: any }> = [
      { run: () => service.getVehicles({}, true).subscribe(), url: '/api/orchestrator/vehicles', body: { items: [] } },
      { run: () => service.getAvailableVehicles(true).subscribe(), url: '/api/orchestrator/vehicles/available', body: {} },
      { run: () => service.getAgents({}, true).subscribe(), url: '/api/orchestrator/agents', body: { items: [] } },
      { run: () => service.getActiveAgents(true).subscribe(), url: '/api/orchestrator/agents/active', body: [] },
      { run: () => service.getSalesAgents(true).subscribe(), url: '/api/orchestrator/agents/specialization/VENTAS_NUEVOS', body: {} },
      { run: () => service.getCustomers({}, true).subscribe(), url: '/api/orchestrator/customers', body: { items: [] } },
      { run: () => service.getActiveCustomers(true).subscribe(), url: '/api/orchestrator/customers/active', body: {} },
      { run: () => service.searchCustomers('Ana', true).subscribe(), url: '/api/orchestrator/customers/search', body: [] },
      { run: () => service.getServices({}, true).subscribe(), url: '/api/orchestrator/services', body: { items: [] } },
      { run: () => service.getActiveServices(true).subscribe(), url: '/api/orchestrator/services/active', body: [] },
      { run: () => service.getSalesServices(true).subscribe(), url: '/api/orchestrator/services/sales', body: {} },
    ];

    calls.forEach(({ run, url, body }) => {
      run();
      const req = httpMock.expectOne((request) => request.url === url);
      expect(req.request.context.get(SILENT_ERROR_TOAST)).toBe(true);
      req.flush(body);
    });
  });

  it('usa el manejo global de errores por defecto en los catálogos', () => {
    service.getAvailableVehicles().subscribe();
    const vehicles = httpMock.expectOne('/api/orchestrator/vehicles/available');
    expect(vehicles.request.context.get(SILENT_ERROR_TOAST)).toBe(false);
    vehicles.flush({});

    service.getSalesAgents().subscribe();
    const agents = httpMock.expectOne('/api/orchestrator/agents/specialization/VENTAS_NUEVOS');
    expect(agents.request.context.get(SILENT_ERROR_TOAST)).toBe(false);
    agents.flush({});

    service.getActiveCustomers().subscribe();
    const customers = httpMock.expectOne('/api/orchestrator/customers/active');
    expect(customers.request.context.get(SILENT_ERROR_TOAST)).toBe(false);
    customers.flush({});

    service.getSalesServices().subscribe();
    const services = httpMock.expectOne('/api/orchestrator/services/sales');
    expect(services.request.context.get(SILENT_ERROR_TOAST)).toBe(false);
    services.flush({});
  });
});
