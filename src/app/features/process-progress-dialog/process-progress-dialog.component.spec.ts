import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { ProcessProgressDialogComponent } from './process-progress-dialog.component';
import { ControlCenterService } from '../../core/services/control-center.service';
import { FlowSseService } from '../../core/services/flow-sse.service';
import { NotificationService } from '../../core/services/notification.service';
import {
  FlowExecutionEvent,
  InterventionResponse,
  ProcessExecutionResponse,
  ProcessExecutionStepResponse,
} from '../../core/interfaces/process.models';

function makeProcess(overrides: Partial<ProcessExecutionResponse> = {}): ProcessExecutionResponse {
  return {
    id: 'p1',
    processTemplateId: 'tpl-1',
    customerId: 'c1',
    status: 'IN_PROGRESS',
    steps: [],
    ...overrides,
  };
}

function makeSteps(): ProcessExecutionStepResponse[] {
  return [
    { id: 's1', stepOrder: 1, name: 'Validar', status: 'COMPLETED', retryCount: 0 },
    { id: 's2', stepOrder: 2, name: 'Firmar', status: 'RUNNING', retryCount: 0 },
  ];
}

function makeIntervention(): InterventionResponse {
  return {
    id: 'i1',
    processId: 'p1',
    stepName: 'Validar identidad',
    stepOrder: 2,
    status: 'PENDING',
    errorMessage: 'Necesitamos confirmar la identidad del cliente.',
    suggestedAction: 'Verificar INE',
    createdAt: '2026-01-01T10:00:00Z',
    updatedAt: '2026-01-01T10:00:00Z',
  };
}

function makeEvent(eventType: string, timestamp = '2026-01-01T10:00:00Z'): FlowExecutionEvent {
  return { executionId: 'p1', flowId: 'compra-vehiculo', eventType, timestamp };
}

function findButton(root: HTMLElement, text: string): HTMLButtonElement | undefined {
  return Array.from<HTMLButtonElement>(root.querySelectorAll('button')).find((button) =>
    button.textContent?.includes(text),
  );
}

describe('ProcessProgressDialogComponent', () => {
  let fixture: ComponentFixture<ProcessProgressDialogComponent>;
  let component: ProcessProgressDialogComponent;
  let controlCenter: Record<string, jest.Mock>;
  let notifications: NotificationService;
  let sse: {
    flowEvents: ReturnType<typeof signal<FlowExecutionEvent[]>>;
    isConnected: ReturnType<typeof signal<boolean>>;
    isReconnecting: ReturnType<typeof signal<boolean>>;
    error: ReturnType<typeof signal<string | null>>;
    connect: jest.Mock;
    clear: jest.Mock;
    disconnect: jest.Mock;
    reconnect: jest.Mock;
  };

  beforeEach(() => {
    controlCenter = {
      getProcess: jest.fn(() => of(makeProcess())),
      getProcessSteps: jest.fn(() => of(makeSteps())),
      listInterventions: jest.fn(() => of([])),
      resumeIntervention: jest.fn(() => of(makeIntervention())),
      retryProcess: jest.fn(() => of(makeProcess())),
    };
    sse = {
      flowEvents: signal<FlowExecutionEvent[]>([]),
      isConnected: signal(false),
      isReconnecting: signal(false),
      error: signal<string | null>(null),
      connect: jest.fn(),
      clear: jest.fn(),
      disconnect: jest.fn(),
      reconnect: jest.fn(),
    };

    TestBed.configureTestingModule({
      imports: [ProcessProgressDialogComponent],
      providers: [
        { provide: ControlCenterService, useValue: controlCenter },
        { provide: FlowSseService, useValue: sse },
      ],
    });
    fixture = TestBed.createComponent(ProcessProgressDialogComponent);
    component = fixture.componentInstance;
    notifications = TestBed.inject(NotificationService);
    fixture.componentRef.setInput('processId', 'p1');
    fixture.detectChanges();
  });

  it('carga el proceso y los pasos, y conecta el monitoreo en tiempo real', () => {
    expect(controlCenter['getProcess']).toHaveBeenCalledWith('p1', true);
    expect(controlCenter['getProcessSteps']).toHaveBeenCalledWith('p1', true);
    expect(sse.clear).toHaveBeenCalled();
    expect(sse.connect).toHaveBeenCalledWith('p1');
    expect(fixture.nativeElement.textContent).toContain('Validar');
    expect(fixture.nativeElement.textContent).toContain('1 / 2');
  });

  it('no consulta intervenciones mientras el proceso sigue en curso', () => {
    expect(controlCenter['listInterventions']).not.toHaveBeenCalled();
  });

  it('muestra la intervención pendiente del proceso y permite reanudarlo', () => {
    controlCenter['getProcess'].mockReturnValue(of(makeProcess({ status: 'PAUSED_FOR_HUMAN' })));
    controlCenter['listInterventions']
      .mockReturnValueOnce(of([makeIntervention()]))
      .mockReturnValue(of([]));
    (fixture.componentInstance as unknown as { retryLoad: () => void }).retryLoad();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Intervención humana requerida');
    expect(fixture.nativeElement.textContent).toContain('Validar identidad');
    expect(fixture.nativeElement.textContent).toContain('Verificar INE');

    findButton(fixture.nativeElement, 'Reanudar proceso')!.click();
    fixture.detectChanges();

    expect(controlCenter['resumeIntervention']).toHaveBeenCalledWith('i1');
    expect(notifications.toasts().some((toast) => toast.tone === 'success')).toBe(true);
    expect(fixture.nativeElement.textContent).not.toContain('Validar identidad');
  });

  it('refresca proceso y pasos cuando llega un evento SSE relevante', () => {
    sse.flowEvents.set([makeEvent('STEP_STARTED')]);
    fixture.detectChanges();
    expect(controlCenter['getProcess']).toHaveBeenCalledTimes(1);

    sse.flowEvents.set([makeEvent('STEP_STARTED'), makeEvent('STEP_FAILED', '2026-01-01T10:01:00Z')]);
    fixture.detectChanges();

    expect(controlCenter['getProcess']).toHaveBeenCalledTimes(2);
    expect(controlCenter['getProcessSteps']).toHaveBeenCalledTimes(2);
  });

  it('consulta la intervención pendiente cuando el flujo se pausa', () => {
    controlCenter['getProcess'].mockReturnValue(of(makeProcess({ status: 'PAUSED_FOR_HUMAN' })));
    sse.flowEvents.set([makeEvent('FLOW_PAUSED')]);
    fixture.detectChanges();

    expect(controlCenter['getProcess']).toHaveBeenCalledTimes(2);
    expect(controlCenter['listInterventions']).toHaveBeenCalledWith(undefined, true);
  });

  it('consulta la intervención pendiente cuando un paso la requiere', () => {
    sse.flowEvents.set([makeEvent('STEP_REQUIRES_INTERVENTION')]);
    fixture.detectChanges();

    expect(controlCenter['listInterventions']).toHaveBeenCalledWith(undefined, true);
    expect(controlCenter['getProcess']).toHaveBeenCalledTimes(1);
  });

  it('muestra un error amigable y permite reintentar la carga', () => {
    controlCenter['getProcessSteps'].mockReturnValue(
      throwError(() => new HttpErrorResponse({
        status: 500,
        error: { message: 'No pudimos actualizar el proceso.', flowCode: 'DIA-500' },
      })),
    );
    (fixture.componentInstance as unknown as { retryLoad: () => void }).retryLoad();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No pudimos actualizar el proceso.');
    expect(fixture.nativeElement.textContent).toContain('DIA-500');

    controlCenter['getProcessSteps'].mockReturnValue(of(makeSteps()));
    findButton(fixture.nativeElement, 'Reintentar')!.click();
    fixture.detectChanges();

    expect(controlCenter['getProcessSteps']).toHaveBeenCalledTimes(3);
    expect(fixture.nativeElement.textContent).not.toContain('DIA-500');
  });

  it('conserva el error del proceso aunque los pasos carguen correctamente', () => {
    controlCenter['getProcess'].mockReturnValue(
      throwError(() => new HttpErrorResponse({
        status: 404,
        error: { message: 'El proceso ya no existe.', flowCode: 'DIA-404' },
      })),
    );
    (fixture.componentInstance as unknown as { retryLoad: () => void }).retryLoad();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('El proceso ya no existe.');
    expect(fixture.nativeElement.textContent).toContain('DIA-404');
  });

  it('informa el error al consultar intervenciones pendientes', () => {
    controlCenter['getProcess'].mockReturnValue(of(makeProcess({ status: 'PAUSED_FOR_HUMAN' })));
    controlCenter['listInterventions'].mockReturnValue(
      throwError(() => new HttpErrorResponse({
        status: 503,
        error: { message: 'No pudimos consultar las intervenciones.' },
      })),
    );
    (fixture.componentInstance as unknown as { retryLoad: () => void }).retryLoad();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No pudimos consultar las intervenciones.');
  });

  it('permite reconectar el monitoreo cuando la conexión está caída', () => {    sse.error.set('Se perdió la conexión en tiempo real.');
    fixture.detectChanges();

    findButton(fixture.nativeElement, 'Reconectar')!.click();

    expect(sse.reconnect).toHaveBeenCalled();
  });

  it('reintenta el proceso y avisa al usuario', () => {
    controlCenter['getProcess'].mockReturnValue(
      of(makeProcess({ status: 'FAILED', userErrorMessage: 'La firma no pudo validarse.' })),
    );
    (fixture.componentInstance as unknown as { retryLoad: () => void }).retryLoad();
    fixture.detectChanges();

    findButton(fixture.nativeElement, 'Reintentar proceso')!.click();
    fixture.detectChanges();

    expect(controlCenter['retryProcess']).toHaveBeenCalledWith('p1');
    expect(notifications.toasts().some((toast) => toast.tone === 'success')).toBe(true);
  });

  it('cierra el diálogo desconectando el monitoreo', () => {
    const closed = jest.fn();
    component.closed.subscribe(closed);

    (fixture.nativeElement.querySelector('button[aria-label="Cerrar"]') as HTMLButtonElement).click();

    expect(sse.disconnect).toHaveBeenCalled();
    expect(closed).toHaveBeenCalledTimes(1);
  });

  it('no ofrece navegación a una página de detalle completa', () => {
    controlCenter['getProcess'].mockReturnValue(of(makeProcess({ status: 'PAUSED_FOR_HUMAN' })));
    controlCenter['listInterventions'].mockReturnValue(of([makeIntervention()]));
    (fixture.componentInstance as unknown as { retryLoad: () => void }).retryLoad();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('button[aria-label="Ver detalle completo"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('a[href="/tracker/p1"]')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Reanudar proceso');
  });
});
