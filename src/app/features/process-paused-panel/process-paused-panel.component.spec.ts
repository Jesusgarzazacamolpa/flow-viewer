import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProcessPausedPanelComponent } from './process-paused-panel.component';

describe('ProcessPausedPanelComponent', () => {
  let fixture: ComponentFixture<ProcessPausedPanelComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [ProcessPausedPanelComponent] });
    fixture = TestBed.createComponent(ProcessPausedPanelComponent);
  });

  function resumeButton(): HTMLButtonElement {
    return fixture.nativeElement.querySelector('button');
  }

  it('explica la pausa y ofrece reanudar por defecto', () => {
    fixture.detectChanges();

    const content = fixture.nativeElement.textContent;
    expect(content).toContain('El proceso está pausado');
    expect(content).toContain('No hay una autorización pendiente registrada.');
    expect(resumeButton().textContent).toContain('Reanudar proceso');
  });

  it('emite resume al reanudar', () => {
    const resume = jest.fn();
    fixture.componentInstance.resume.subscribe(resume);
    fixture.detectChanges();

    resumeButton().click();

    expect(resume).toHaveBeenCalledTimes(1);
  });

  it('usa la descripción y las etiquetas recibidas', () => {
    fixture.componentRef.setInput('description', 'El orquestador no conserva el estado.');
    fixture.componentRef.setInput('label', 'Continuar');
    fixture.componentRef.setInput('busyLabel', 'Continuando…');
    fixture.componentRef.setInput('busy', true);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('El orquestador no conserva el estado.');
    expect(resumeButton().textContent).toContain('Continuando…');
    expect(resumeButton().disabled).toBe(true);
  });
});
