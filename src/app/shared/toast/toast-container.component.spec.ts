import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ToastContainerComponent } from './toast-container.component';
import { NotificationService } from '../../core/services/notification.service';

function buttonByText(element: HTMLElement, text: string): HTMLButtonElement | undefined {
  return Array.from(element.querySelectorAll('button')).find((button) =>
    button.textContent?.includes(text),
  );
}

describe('ToastContainerComponent', () => {
  let fixture: ComponentFixture<ToastContainerComponent>;
  let notifications: NotificationService;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [ToastContainerComponent] });
    fixture = TestBed.createComponent(ToastContainerComponent);
    notifications = TestBed.inject(NotificationService);
  });

  it('muestra el mensaje amigable, título y código de referencia', () => {
    notifications.error('El vehículo ya no está disponible.', {
      title: 'No pudimos iniciar el flujo',
      reference: 'FLOW-01',
      duration: 0,
    });

    fixture.detectChanges();
    const content = fixture.nativeElement.textContent;

    expect(content).toContain('No pudimos iniciar el flujo');
    expect(content).toContain('El vehículo ya no está disponible.');
    expect(content).toContain('FLOW-01');
    expect(fixture.nativeElement.querySelector('[role="alert"]')).not.toBeNull();
  });

  it('ejecuta la acción de reintento y cierra el toast', () => {
    const retry = jest.fn();
    notifications.error('No se pudo cargar.', {
      duration: 0,
      action: { label: 'Reintentar', run: retry },
    });
    fixture.detectChanges();

    const actionButton = buttonByText(fixture.nativeElement, 'Reintentar');
    actionButton?.click();
    fixture.detectChanges();

    expect(retry).toHaveBeenCalledTimes(1);
    expect(notifications.toasts()).toHaveLength(0);
  });

  it('permite cerrar manualmente con el botón accesible', () => {
    notifications.success('Guardado correctamente.', { duration: 0 });
    fixture.detectChanges();

    const close = fixture.nativeElement.querySelector(
      'button[aria-label="Cerrar notificación"]',
    ) as HTMLButtonElement;
    close.click();
    fixture.detectChanges();

    expect(notifications.toasts()).toHaveLength(0);
  });

  it('usa role status para mensajes no críticos', () => {
    notifications.info('Proceso en curso.', { duration: 0 });
    fixture.detectChanges();

    const toast = fixture.nativeElement.querySelector('[role="status"]');
    expect(toast).not.toBeNull();
  });

  it('aplica estilos e iconos para cada tono', () => {
    const styles = fixture.componentInstance as unknown as {
      toneContainerClass: (tone: string) => string;
      toneIconWrapperClass: (tone: string) => string;
      toneIcon: (tone: string) => string;
      actionIcon: (tone: string) => string;
    };

    expect(styles.toneContainerClass('success')).toContain('bg-green-50');
    expect(styles.toneContainerClass('warning')).toContain('bg-amber-50');
    expect(styles.toneContainerClass('info')).toContain('bg-sky-50');
    expect(styles.toneContainerClass('error')).toContain('bg-red-50');

    expect(styles.toneIconWrapperClass('success')).toContain('bg-green-600');
    expect(styles.toneIconWrapperClass('warning')).toContain('bg-amber-600');
    expect(styles.toneIconWrapperClass('info')).toContain('bg-sky-600');
    expect(styles.toneIconWrapperClass('error')).toContain('bg-red-600');

    expect(styles.toneIcon('success')).toBe('check');
    expect(styles.toneIcon('warning')).toBe('exclamation-triangle');
    expect(styles.toneIcon('info')).toBe('information-circle');
    expect(styles.toneIcon('error')).toBe('exclamation-circle');

    expect(styles.actionIcon('error')).toBe('arrow-path');
    expect(styles.actionIcon('warning')).toBe('arrow-path');
    expect(styles.actionIcon('info')).toBe('check');
  });
});
