import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StepTimelineComponent } from './step-timeline.component';
import { ProcessExecutionStepResponse } from '../../core/interfaces/process.models';

function makeStep(overrides: Partial<ProcessExecutionStepResponse> = {}): ProcessExecutionStepResponse {
  return {
    id: 's1',
    stepOrder: 1,
    name: 'Validar datos',
    status: 'COMPLETED',
    retryCount: 0,
    ...overrides,
  };
}

describe('StepTimelineComponent', () => {
  let fixture: ComponentFixture<StepTimelineComponent>;
  let component: StepTimelineComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [StepTimelineComponent] });
    fixture = TestBed.createComponent(StepTimelineComponent);
    component = fixture.componentInstance;
  });

  it('renderiza los pasos y calcula el progreso', () => {
    component.steps = [
      makeStep(),
      makeStep({ id: 's2', stepOrder: 2, name: 'Enviar correo', status: 'RUNNING' }),
    ];
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Validar datos');
    expect(fixture.nativeElement.textContent).toContain('Enviar correo');
    expect(component.completedCount()).toBe(1);
    expect(component.totalCount()).toBe(2);
  });

  it('expande y contrae los detalles del paso', () => {
    component.steps = [makeStep()];
    fixture.detectChanges();

    const toggle = fixture.nativeElement.querySelector('button[aria-expanded]') as HTMLButtonElement;
    expect(toggle.getAttribute('aria-expanded')).toBe('false');

    toggle.click();
    fixture.detectChanges();

    expect(component.isExpanded(0)).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('s1');

    toggle.click();
    fixture.detectChanges();
    expect(component.isExpanded(0)).toBe(false);
  });

  it('permite reintentar pasos fallidos', () => {
    const retried = jest.fn();
    component.retryStep.subscribe(retried);
    component.steps = [makeStep({ status: 'FAILED', errorMessage: 'Falló la validación' })];
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Falló la validación');
    const retry = fixture.nativeElement.querySelector('button[title="Reintentar paso"]') as HTMLButtonElement;
    retry.click();

    expect(retried).toHaveBeenCalledWith(1);
  });

  it.each([
    ['COMPLETED', 'success'],
    ['SUCCESS', 'success'],
    ['SENT', 'success'],
    ['FAILED', 'error'],
    ['ERROR', 'error'],
    ['REQUIRES_INTERVENTION', 'warning'],
    ['PAUSED_FOR_HUMAN', 'warning'],
    ['RUNNING', 'warning'],
    ['PENDING', 'info'],
  ])('clasifica el estado %s como %s', (status, severity) => {
    expect(component.statusSeverity(status)).toBe(severity);
  });

  it('expone clases e iconos coherentes con la severidad', () => {
    expect(component.dotBorderClass('COMPLETED')).toContain('border-green-500');
    expect(component.dotBorderClass('FAILED')).toContain('border-red-500');
    expect(component.dotBorderClass('PAUSED_FOR_HUMAN')).toContain('border-amber-500');
    expect(component.dotBorderClass('PENDING')).toContain('border-slate-400');

    expect(component.dotInnerClass('COMPLETED')).toContain('bg-green-500');
    expect(component.dotInnerClass('FAILED')).toContain('bg-red-500');
    expect(component.dotInnerClass('RUNNING')).toContain('bg-amber-500');
    expect(component.dotInnerClass('PENDING')).toContain('bg-slate-400');

    expect(component.statusIconName('COMPLETED')).toBe('check');
    expect(component.statusIconName('FAILED')).toBe('exclamation-triangle');
    expect(component.statusIconName('PAUSED_FOR_HUMAN')).toBe('shield');
    expect(component.statusIconName('PENDING')).toBe('clock');

    expect(component.canRetry('FAILED')).toBe(true);
    expect(component.canRetry('ERROR')).toBe(true);
    expect(component.canRetry('COMPLETED')).toBe(false);
  });
});
