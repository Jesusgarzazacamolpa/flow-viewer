import { TestBed } from '@angular/core/testing';
import { NotificationService } from './notification.service';

describe('NotificationService', () => {
  let service: NotificationService;

  beforeEach(() => {
    jest.useFakeTimers();
    TestBed.configureTestingModule({});
    service = TestBed.inject(NotificationService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('crea toasts con títulos predeterminados por tono', () => {
    service.success('Guardado');
    service.error('Falló');
    service.warning('Cuidado');
    service.info('Dato');

    expect(service.toasts().map((toast) => toast.title)).toEqual([
      'Listo',
      'No pudimos completar la acción',
      'Atención',
      'Información',
    ]);
  });

  it('respeta título, referencia y duración personalizados', () => {
    service.error('No se pudo guardar', {
      title: 'Error al guardar',
      reference: 'FLOW-01',
      duration: 1000,
    });

    const [toast] = service.toasts();
    expect(toast.title).toBe('Error al guardar');
    expect(toast.reference).toBe('FLOW-01');
    expect(toast.duration).toBe(1000);
  });

  it('descarta automáticamente el toast al vencer su duración', () => {
    service.success('Guardado', { duration: 3000 });
    expect(service.toasts()).toHaveLength(1);

    jest.advanceTimersByTime(2999);
    expect(service.toasts()).toHaveLength(1);

    jest.advanceTimersByTime(1);
    expect(service.toasts()).toHaveLength(0);
  });

  it('mantiene los toasts con duración cero hasta que se cierran', () => {
    service.info('Permanente', { duration: 0 });
    jest.advanceTimersByTime(60000);
    expect(service.toasts()).toHaveLength(1);

    service.dismiss(service.toasts()[0].id);
    expect(service.toasts()).toHaveLength(0);
  });

  it('elimina un toast y cancela su temporizador', () => {
    const id = service.success('Guardado', { duration: 5000 });
    service.dismiss(id);

    jest.advanceTimersByTime(5000);
    expect(service.toasts()).toHaveLength(0);
  });

  it('ejecuta la acción antes de cerrar el toast', () => {
    const action = jest.fn();
    service.error('Falló', { action: { label: 'Reintentar', run: action } });

    const id = service.toasts()[0].id;
    service.runAction(id);

    expect(action).toHaveBeenCalledTimes(1);
    expect(service.toasts()).toHaveLength(0);
  });

  it('limpia todos los toasts y temporizadores', () => {
    service.success('Uno');
    service.error('Dos');

    service.clear();

    expect(service.toasts()).toHaveLength(0);
    jest.advanceTimersByTime(60000);
    expect(service.toasts()).toHaveLength(0);
  });
});
