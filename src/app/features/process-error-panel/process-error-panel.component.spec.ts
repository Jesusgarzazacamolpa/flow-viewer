import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProcessErrorPanelComponent } from './process-error-panel.component';

describe('ProcessErrorPanelComponent', () => {
  let fixture: ComponentFixture<ProcessErrorPanelComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [ProcessErrorPanelComponent] });
    fixture = TestBed.createComponent(ProcessErrorPanelComponent);
  });

  function retryButton(): HTMLButtonElement {
    return fixture.nativeElement.querySelector('button');
  }

  it('muestra textos por defecto cuando no recibe datos', () => {
    fixture.detectChanges();

    const content = fixture.nativeElement.textContent;
    expect(content).toContain('Error del proceso');
    expect(content).toContain('Error desconocido');
    expect(retryButton().textContent).toContain('Reintentar proceso');
  });

  it('usa los textos recibidos y emite retry', () => {
    const retry = jest.fn();
    fixture.componentInstance.retry.subscribe(retry);
    fixture.componentRef.setInput('title', 'No pudimos firmar');
    fixture.componentRef.setInput('message', 'El servicio de firma no respondió.');
    fixture.componentRef.setInput('actionLabel', 'Volver a intentar');
    fixture.detectChanges();

    const content = fixture.nativeElement.textContent;
    expect(content).toContain('No pudimos firmar');
    expect(content).toContain('El servicio de firma no respondió.');
    expect(retryButton().textContent).toContain('Volver a intentar');

    retryButton().click();
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it('deshabilita el botón mientras la acción está en curso', () => {
    fixture.componentRef.setInput('busy', true);
    fixture.detectChanges();

    expect(retryButton().disabled).toBe(true);
    expect(retryButton().textContent).toContain('Reintentando…');
  });
});
