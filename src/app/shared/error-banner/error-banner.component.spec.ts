import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ErrorBannerComponent } from './error-banner.component';

describe('ErrorBannerComponent', () => {
  let fixture: ComponentFixture<ErrorBannerComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [ErrorBannerComponent] });
    fixture = TestBed.createComponent(ErrorBannerComponent);
  });

  it('muestra el mensaje amigable y el código de soporte', () => {
    fixture.componentRef.setInput('message', 'No pudimos cargar las ejecuciones.');
    fixture.componentRef.setInput('title', 'Error de carga');
    fixture.componentRef.setInput('reference', 'FLOW-02');
    fixture.detectChanges();

    const content = fixture.nativeElement.textContent;
    expect(content).toContain('Error de carga');
    expect(content).toContain('No pudimos cargar las ejecuciones.');
    expect(content).toContain('FLOW-02');
    expect(fixture.nativeElement.querySelector('[role="alert"]')).not.toBeNull();
  });

  it('emite el evento retry al pulsar Reintentar', () => {
    const retry = jest.fn();
    fixture.componentInstance.retry.subscribe(retry);
    fixture.componentRef.setInput('message', 'No pudimos cargar.');
    fixture.detectChanges();

    const buttons = Array.from<HTMLButtonElement>(
      fixture.nativeElement.querySelectorAll('button'),
    );
    const button = buttons.find((item) => item.textContent?.includes('Reintentar'))!;
    button.click();

    expect(retry).toHaveBeenCalledTimes(1);
  });

  it('oculta la acción cuando el error no es reintentable', () => {
    fixture.componentRef.setInput('message', 'Ya no hay nada que hacer.');
    fixture.componentRef.setInput('retryable', false);
    fixture.componentRef.setInput('retryLabel', 'Volver');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('button')).toBeNull();
  });
});
