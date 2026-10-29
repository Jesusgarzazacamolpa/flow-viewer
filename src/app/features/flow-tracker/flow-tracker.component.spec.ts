import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { FlowTrackerComponent } from './flow-tracker.component';
import { ControlCenterService } from '../../core/services/control-center.service';
import { NotificationService } from '../../core/services/notification.service';
import { ProcessExecutionResponse, ProcessExecutionStepResponse } from '../../core/interfaces/process.models';

function httpError(message: string, status = 500, flowCode = 'TRK-01'): HttpErrorResponse {
  return new HttpErrorResponse({ status, statusText: 'Error', error: { message, flowCode } });
}

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
    { id: 's2', stepOrder: 2, name: 'Pausar', status: 'FAILED', retryCount: 1 },
  ];
}

function findButton(root: HTMLElement, text: string): HTMLButtonElement | undefined {
  return Array.from<HTMLButtonElement>(root.querySelectorAll('button')).find((button) =>
    button.textContent?.includes(text),
  );
}

describe('FlowTrackerComponent', () => {
  let fixture: ComponentFixture<FlowTrackerComponent>;
  let component: FlowTrackerComponent;
  let controlCenter: Record<string, jest.Mock>;
  let notifications: NotificationService;
  let router: { navigate: jest.Mock };

  beforeEach(() => {
    controlCenter = {
      getProcess: jest.fn(() => of(makeProcess())),
      getProcessSteps: jest.fn(() => of(makeSteps())),
      retryProcess: jest.fn(() => of(makeProcess({ status: 'IN_PROGRESS' }))),
      retryStep: jest.fn(() => of(makeProcess())),
    };
    router = { navigate: jest.fn() };

    TestBed.configureTestingModule({
      imports: [FlowTrackerComponent],
      providers: [
        { provide: ControlCenterService, useValue: controlCenter },
        { provide: Router, useValue: router },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: () => 'p1' } } },
        },
      ],
    });
    fixture = TestBed.createComponent(FlowTrackerComponent);
    component = fixture.componentInstance;
    notifications = TestBed.inject(NotificationService);
    fixture.detectChanges();
  });

  it('carga el proceso y sus pasos al iniciar', () => {
    expect(controlCenter['getProcess']).toHaveBeenCalledWith('p1', true);
    expect(controlCenter['getProcessSteps']).toHaveBeenCalledWith('p1', true);
    expect(fixture.nativeElement.textContent).toContain('Validar');
    expect(fixture.nativeElement.textContent).toContain('1 / 2');
  });

  it('calcula el progreso a partir del estado del proceso', () => {
    const state = component as unknown as {
      completedSteps: () => number;
      totalSteps: () => number;
      isFailed: () => boolean;
      progressLabel: () => string;
    };

    expect(state.completedSteps()).toBe(1);
    expect(state.totalSteps()).toBe(2);
    expect(state.isFailed()).toBe(false);
    expect(state.progressLabel()).toBe('1 de 2 pasos completados');

    controlCenter['getProcess'].mockReturnValue(of(makeProcess({ status: 'FAILED' })));
    (fixture.nativeElement.querySelector('button[aria-label="Recargar"]') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(state.isFailed()).toBe(true);
    expect(state.progressLabel()).toBe('Falló el proceso');
  });

  it('muestra un error amigable y reintenta la carga', () => {
    controlCenter['getProcessSteps'].mockReturnValue(
      throwError(() => httpError('No pudimos cargar los pasos.', 503, 'TRK-503')),
    );

    (fixture.nativeElement.querySelector('button[aria-label="Recargar"]') as HTMLButtonElement).click();
    fixture.detectChanges();

    const content = fixture.nativeElement.textContent;
    expect(content).toContain('No pudimos cargar el proceso');
    expect(content).toContain('No pudimos cargar los pasos.');
    expect(content).toContain('TRK-503');

    controlCenter['getProcessSteps'].mockReturnValue(of(makeSteps()));
    findButton(fixture.nativeElement, 'Reintentar carga')!.click();
    fixture.detectChanges();

    expect(controlCenter['getProcessSteps']).toHaveBeenCalledTimes(3);
    expect(fixture.nativeElement.textContent).not.toContain('No pudimos cargar los pasos.');
  });

  it('reintenta el proceso completo y avisa al usuario', () => {
    controlCenter['getProcess'].mockReturnValue(of(makeProcess({ status: 'FAILED' })));
    (fixture.nativeElement.querySelector('button[aria-label="Recargar"]') as HTMLButtonElement).click();
    fixture.detectChanges();

    const retry = findButton(fixture.nativeElement, 'Reintentar proceso')!;
    retry.click();
    fixture.detectChanges();

    expect(controlCenter['retryProcess']).toHaveBeenCalledWith('p1', undefined);
    expect(notifications.toasts().some((toast) => toast.tone === 'success')).toBe(true);
  });

  it('reintenta un paso desde la línea de tiempo', () => {
    controlCenter['getProcess'].mockReturnValue(of(makeProcess({ status: 'FAILED' })));
    (fixture.nativeElement.querySelector('button[aria-label="Recargar"]') as HTMLButtonElement).click();
    fixture.detectChanges();

    const retryStepButton = fixture.nativeElement.querySelector(
      'app-step-timeline button[title="Reintentar paso"]',
    ) as HTMLButtonElement;
    retryStepButton.click();
    fixture.detectChanges();

    expect(controlCenter['retryStep']).toHaveBeenCalledWith('p1', 2);
    expect(notifications.toasts().some((toast) => toast.tone === 'success')).toBe(true);
  });

  it('oculta el reintento de paso mientras el proceso está en ejecución', () => {
    expect((component as unknown as { canRetryProcess: () => boolean }).canRetryProcess()).toBe(false);

    const retryStepButton = fixture.nativeElement.querySelector(
      'app-step-timeline button[title="Reintentar paso"]',
    );
    expect(retryStepButton).toBeNull();
  });

  it('solicita información al reanudar un proceso pausado y la envía', () => {
    controlCenter['getProcess'].mockReturnValue(of(makeProcess({ status: 'PAUSED_FOR_HUMAN' })));
    (fixture.nativeElement.querySelector('button[aria-label="Recargar"]') as HTMLButtonElement).click();
    fixture.detectChanges();

    findButton(fixture.nativeElement, 'Reanudar')!.click();
    fixture.detectChanges();

    const textarea = fixture.nativeElement.querySelector('textarea') as HTMLTextAreaElement;
    expect(textarea).not.toBeNull();
    const inputSection = textarea.closest('div.mt-3') as HTMLElement;

    findButton(inputSection, 'Reanudar')!.click();
    expect(controlCenter['retryProcess']).not.toHaveBeenCalled();

    textarea.value = 'Datos verificados';
    textarea.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    findButton(inputSection, 'Reanudar')!.click();
    fixture.detectChanges();

    expect(controlCenter['retryProcess']).toHaveBeenCalledWith('p1', 'Datos verificados');
  });

  it('vuelve al dashboard', () => {
    (fixture.nativeElement.querySelector('button[aria-label="Volver"]') as HTMLButtonElement).click();

    expect(router.navigate).toHaveBeenCalledWith(['']);
  });

  it('muestra el progreso parcial y el completado', () => {
    controlCenter['getProcessSteps'].mockReturnValue(
      of([
        { id: 's1', stepOrder: 1, name: 'Validar', status: 'COMPLETED', retryCount: 0 },
        { id: 's2', stepOrder: 2, name: 'Firmar', status: 'RUNNING', retryCount: 0 },
      ]),
    );
    controlCenter['getProcess'].mockReturnValue(of(makeProcess({ status: 'RUNNING' })));
    (fixture.nativeElement.querySelector('button[aria-label="Recargar"]') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('1 de 2 pasos completados');
    expect((component as unknown as { isInProgress: () => boolean }).isInProgress()).toBe(true);

    controlCenter['getProcessSteps'].mockReturnValue(
      of([
        { id: 's1', stepOrder: 1, name: 'Validar', status: 'COMPLETED', retryCount: 0 },
        { id: 's2', stepOrder: 2, name: 'Firmar', status: 'COMPLETED', retryCount: 0 },
      ]),
    );
    controlCenter['getProcess'].mockReturnValue(of(makeProcess({ status: 'COMPLETED' })));
    (fixture.nativeElement.querySelector('button[aria-label="Recargar"]') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('¡Proceso completado!');
  });

  it('muestra el error amigable cuando falla la carga del proceso', () => {
    controlCenter['getProcess'].mockReturnValue(
      throwError(() => httpError('No pudimos cargar el proceso.', 404, 'TRK-404')),
    );
    (fixture.nativeElement.querySelector('button[aria-label="Recargar"]') as HTMLButtonElement).click();
    fixture.detectChanges();

    const content = fixture.nativeElement.textContent;
    expect(content).toContain('No pudimos cargar el proceso.');
    expect(content).toContain('TRK-404');
  });
});
