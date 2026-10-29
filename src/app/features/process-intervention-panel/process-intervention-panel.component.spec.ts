import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProcessInterventionPanelComponent } from './process-intervention-panel.component';
import { InterventionResponse } from '../../core/interfaces/process.models';

function makeIntervention(overrides: Partial<InterventionResponse> = {}): InterventionResponse {
  return {
    id: 'i1',
    processId: 'p1',
    stepName: 'Validar identidad',
    stepOrder: 2,
    status: 'PENDING_REVIEW',
    errorMessage: 'Necesitamos confirmar la identidad del cliente.',
    suggestedAction: 'Verificar INE',
    createdAt: '2026-01-01T10:00:00Z',
    updatedAt: '2026-01-01T10:00:00Z',
    ...overrides,
  };
}

function findButton(root: HTMLElement, text: string): HTMLButtonElement | undefined {
  return Array.from<HTMLButtonElement>(root.querySelectorAll('button')).find((button) =>
    button.textContent?.includes(text),
  );
}

describe('ProcessInterventionPanelComponent', () => {
  let fixture: ComponentFixture<ProcessInterventionPanelComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [ProcessInterventionPanelComponent] });
    fixture = TestBed.createComponent(ProcessInterventionPanelComponent);
    fixture.componentRef.setInput('intervention', makeIntervention());
  });

  it('muestra los datos de la intervención pendiente', () => {
    fixture.detectChanges();

    const content = fixture.nativeElement.textContent;
    expect(content).toContain('Intervención humana requerida');
    expect(content).toContain('Validar identidad');
    expect(content).toContain('Necesitamos confirmar la identidad del cliente.');
    expect(content).toContain('Acción sugerida: Verificar INE');
  });

  it('omite los textos opcionales cuando la intervención no los trae', () => {
    fixture.componentRef.setInput('intervention', makeIntervention({
      errorMessage: undefined,
      suggestedAction: undefined,
    }));
    fixture.detectChanges();

    const content = fixture.nativeElement.textContent;
    expect(content).not.toContain('Acción sugerida');
    expect(content).toContain('Validar identidad');
  });

  it('emite resume y reject desde sus botones', () => {
    const resume = jest.fn();
    const reject = jest.fn();
    fixture.componentInstance.resume.subscribe(resume);
    fixture.componentInstance.reject.subscribe(reject);
    fixture.detectChanges();

    findButton(fixture.nativeElement, 'Reanudar proceso')!.click();
    findButton(fixture.nativeElement, 'Rechazar intervención')!.click();

    expect(resume).toHaveBeenCalledTimes(1);
    expect(reject).toHaveBeenCalledTimes(1);
  });

  it('bloquea las acciones mientras se resuelve la intervención', () => {
    fixture.componentRef.setInput('resuming', true);
    fixture.detectChanges();

    expect(findButton(fixture.nativeElement, 'Reanudando…')!.disabled).toBe(true);
    expect(findButton(fixture.nativeElement, 'Rechazar intervención')!.disabled).toBe(true);
  });
});
