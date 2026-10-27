import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject, of, throwError } from 'rxjs';
import { ShieldComponent } from './shield.component';
import { ShieldService } from '../../core/services/shield.service';
import { NotificationService } from '../../core/services/notification.service';
import { ShieldAlert, ShieldStats } from '../../core/interfaces/shield.interface';

function makeStats(overrides: Partial<ShieldStats> = {}): ShieldStats {
  return {
    totalAlerts: 4,
    alertsBySeverity: { LOW: 1, MEDIUM: 1, HIGH: 1, CRITICAL: 1 },
    alertsLast24h: 3,
    resolvedCount: 2,
    ...overrides,
  };
}

function makeAlert(overrides: Partial<ShieldAlert> = {}): ShieldAlert {
  return {
    id: 'a1',
    severity: 'CRITICAL',
    category: 'ACCESO',
    message: 'Intentos de acceso fallidos repetidos.',
    source: 'auth-service',
    timestamp: '2026-01-01T10:00:00Z',
    resolved: false,
    ...overrides,
  };
}

function findButton(root: HTMLElement, text: string): HTMLButtonElement | undefined {
  return Array.from<HTMLButtonElement>(root.querySelectorAll('button')).find((button) =>
    button.textContent?.includes(text),
  );
}

describe('ShieldComponent', () => {
  let fixture: ComponentFixture<ShieldComponent>;
  let component: ShieldComponent;
  let shieldService: Record<string, jest.Mock>;
  let notifications: NotificationService;

  beforeEach(() => {
    shieldService = {
      getAlerts: jest.fn(() => of([makeAlert(), makeAlert({ id: 'a2', severity: 'LOW', resolved: true })])),
      getStats: jest.fn(() => of(makeStats())),
      resolveAlert: jest.fn(() => of(undefined)),
    };

    TestBed.configureTestingModule({
      imports: [ShieldComponent],
      providers: [{ provide: ShieldService, useValue: shieldService }],
    });
    fixture = TestBed.createComponent(ShieldComponent);
    component = fixture.componentInstance;
    notifications = TestBed.inject(NotificationService);
    fixture.detectChanges();
  });

  it('muestra las métricas y las alertas recientes', () => {
    expect(shieldService['getAlerts']).toHaveBeenCalledWith(true);
    expect(shieldService['getStats']).toHaveBeenCalledWith(true);

    const content = fixture.nativeElement.textContent;
    expect(content).toContain('Intentos de acceso fallidos repetidos.');
    expect(content).toContain('auth-service');
    expect(content).toContain('CRITICAL');
    expect(content).toContain('LOW');
    expect(content).toContain('Activa');
    expect(content).toContain('Resuelta');
  });

  it('marca una alerta como resuelta y refresca las métricas', () => {
    findButton(fixture.nativeElement, 'Resolver')!.click();
    fixture.detectChanges();

    expect(shieldService['resolveAlert']).toHaveBeenCalledWith('a1');
    expect(notifications.toasts().some((toast) => toast.tone === 'success')).toBe(true);
    expect(shieldService['getStats']).toHaveBeenCalledTimes(2);

    const rows = Array.from<HTMLElement>(fixture.nativeElement.querySelectorAll('tbody tr'));
    expect(rows[0].textContent).toContain('Resuelta');
  });

  it('muestra el mensaje amigable del backend y reintenta la carga', () => {
    shieldService['getAlerts'].mockReturnValue(
      throwError(() => new HttpErrorResponse({
        status: 500,
        error: { message: 'No pudimos consultar las alertas.', flowCode: 'SH-500' },
      })),
    );
    (component as unknown as { refresh: () => void }).refresh();
    fixture.detectChanges();

    const content = fixture.nativeElement.textContent;
    expect(content).toContain('No pudimos cargar las alertas');
    expect(content).toContain('No pudimos consultar las alertas.');
    expect(content).toContain('SH-500');

    shieldService['getAlerts'].mockReturnValue(of([]));
    findButton(fixture.nativeElement, 'Reintentar')!.click();
    fixture.detectChanges();

    expect(shieldService['getAlerts']).toHaveBeenCalledTimes(3);
    expect(fixture.nativeElement.textContent).toContain('No hay alertas.');
  });

  it('indica cuando está cargando y deshabilita la recarga', () => {
    const alertsRequest = new Subject<ShieldAlert[]>();
    shieldService['getAlerts'].mockReturnValue(alertsRequest.asObservable());
    (component as unknown as { refresh: () => void }).refresh();
    fixture.detectChanges();

    const reload = findButton(fixture.nativeElement, 'Cargando')!;
    expect(reload.disabled).toBe(true);

    alertsRequest.next([]);
    alertsRequest.complete();
    fixture.detectChanges();

    expect(findButton(fixture.nativeElement, 'Recargar')?.disabled).toBe(false);
  });

  it('colorea cada severidad', () => {
    const severityClass = (component as unknown as { severityClass: (severity: ShieldAlert['severity']) => string }).severityClass;
    const rows = Array.from<HTMLElement>(fixture.nativeElement.querySelectorAll('tbody tr'));
    expect(rows[0].querySelector('span')?.className).toContain('bg-red-100');

    expect(severityClass('HIGH')).toContain('bg-orange-100');
    expect(severityClass('MEDIUM')).toContain('bg-amber-100');
    expect(severityClass('LOW')).toContain('bg-blue-100');
    expect(severityClass('DESCONOCIDA' as ShieldAlert['severity'])).toContain('bg-slate-100');
  });
});
