import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { HumanInterventionService } from './human-intervention.service';
import { SILENT_ERROR_TOAST } from '../interceptors/http-error.interceptor';

describe('HumanInterventionService', () => {
  let service: HumanInterventionService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(HumanInterventionService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('lista intervenciones con opción silenciosa', () => {
    service.getInterventions(true).subscribe();
    const req = httpMock.expectOne('/api/interventions');
    expect(req.request.context.get(SILENT_ERROR_TOAST)).toBe(true);
    req.flush([]);
  });

  it('consulta una intervención', () => {
    service.getIntervention('i1').subscribe();
    httpMock.expectOne('/api/interventions/i1').flush({});
  });

  it('usa el manejo global de errores por defecto al listar', () => {
    service.getInterventions().subscribe();
    const req = httpMock.expectOne('/api/interventions');
    expect(req.request.context.get(SILENT_ERROR_TOAST)).toBe(false);
    req.flush([]);
  });

  it('actualiza y asigna una intervención', () => {
    service.updateIntervention('i1', { status: 'CANCEL' }).subscribe();
    const update = httpMock.expectOne('/api/interventions/i1');
    expect(update.request.method).toBe('PUT');
    expect(update.request.body).toEqual({ status: 'CANCEL' });
    update.flush({});

    service.assignToMe('i1', 'ana').subscribe();
    const assign = httpMock.expectOne('/api/interventions/i1/assign');
    expect(assign.request.method).toBe('PATCH');
    expect(assign.request.body).toEqual({ assignee: 'ana' });
    assign.flush({});
  });
});
