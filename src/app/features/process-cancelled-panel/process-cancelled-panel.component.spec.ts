import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProcessCancelledPanelComponent } from './process-cancelled-panel.component';

describe('ProcessCancelledPanelComponent', () => {
  let fixture: ComponentFixture<ProcessCancelledPanelComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [ProcessCancelledPanelComponent] });
    fixture = TestBed.createComponent(ProcessCancelledPanelComponent);
  });

  it('muestra los textos por defecto', () => {
    fixture.detectChanges();

    const content = fixture.nativeElement.textContent;
    expect(content).toContain('Proceso cancelado');
    expect(content).toContain('El proceso se canceló y no puede reanudarse.');
    expect(fixture.nativeElement.querySelector('button')).toBeNull();
  });

  it('prioriza los textos recibidos', () => {
    fixture.componentRef.setInput('title', 'Autorización rechazada');
    fixture.componentRef.setInput('message', 'La autorización fue rechazada.');
    fixture.detectChanges();

    const content = fixture.nativeElement.textContent;
    expect(content).toContain('Autorización rechazada');
    expect(content).toContain('La autorización fue rechazada.');
  });
});
