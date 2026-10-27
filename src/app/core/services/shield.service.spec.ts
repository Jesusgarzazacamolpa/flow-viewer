import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ShieldService } from './shield.service';
import { SILENT_ERROR_TOAST } from '../interceptors/http-error.interceptor';

describe('ShieldService', () => {
  let service: ShieldService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ShieldService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('consulta alertas y estadísticas, con opción silenciosa', () => {
    service.getAlerts(true).subscribe();
    const alerts = httpMock.expectOne('/api/shield/alerts');
    expect(alerts.request.context.get(SILENT_ERROR_TOAST)).toBe(true);
    alerts.flush([]);

    service.getAlert('a1').subscribe();
    httpMock.expectOne('/api/shield/alerts/a1').flush({});

    service.getStats(true).subscribe();
    const stats = httpMock.expectOne('/api/shield/stats');
    expect(stats.request.context.get(SILENT_ERROR_TOAST)).toBe(true);
    stats.flush({});
  });

  it('resuelve una alerta', () => {
    service.resolveAlert('a1').subscribe();
    const req = httpMock.expectOne('/api/shield/alerts/a1/resolve');
    expect(req.request.method).toBe('POST');
    req.flush(null);
  });

  it('delega el manejo de errores al interceptor global por defecto', () => {
    service.getAlerts().subscribe();
    const alerts = httpMock.expectOne('/api/shield/alerts');
    expect(alerts.request.context.get(SILENT_ERROR_TOAST)).toBe(false);
    alerts.flush([]);

    service.getStats().subscribe();
    const stats = httpMock.expectOne('/api/shield/stats');
    expect(stats.request.context.get(SILENT_ERROR_TOAST)).toBe(false);
    stats.flush({});
  });
});
