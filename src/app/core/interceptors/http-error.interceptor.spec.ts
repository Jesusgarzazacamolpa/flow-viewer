import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';
import {
  SILENT_ERROR_TOAST,
  extractBackendMessage,
  httpErrorInterceptor,
  silentErrorOptions,
  toUserFacingError,
} from './http-error.interceptor';
import { NotificationService } from '../services/notification.service';
import { UserFacingError } from '../models/api-error.model';

describe('httpErrorInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let notifications: NotificationService;

  beforeEach(() => {
    jest.useFakeTimers();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([httpErrorInterceptor])),
        provideHttpClientTesting(),
      ],
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    notifications = TestBed.inject(NotificationService);
  });

  afterEach(() => {
    httpMock.verify();
    jest.useRealTimers();
  });

  async function failRequest(
    body: any,
    status: number,
    statusText = 'Error',
    options?: { context?: ReturnType<typeof silentErrorOptions>['context']; method?: 'GET' | 'POST' },
  ): Promise<UserFacingError> {
    const method = options?.method ?? 'GET';
    const request$ =
      method === 'POST'
        ? http.post('/api/processes', {}, options?.context ? { context: options.context } : undefined)
        : http.get('/api/processes', options?.context ? { context: options.context } : undefined);

    const result = firstValueFrom(request$).catch((error: unknown) => error);
    const req = httpMock.expectOne('/api/processes');
    req.flush(body, { status, statusText });
    const error = await result;
    expect(error).toBeInstanceOf(UserFacingError);
    return error as UserFacingError;
  }

  it('extrae el mensaje amigable y el código de flujo del backend', async () => {
    const error = await failRequest(
      {
        flowCode: 'FLOW-VEHICLE-01',
        message: 'El vehículo seleccionado ya no está disponible. Elige otro para continuar.',
        traceId: 'trace-123',
      },
      409,
      'Conflict',
    );

    expect(error.message).toBe(
      'El vehículo seleccionado ya no está disponible. Elige otro para continuar.',
    );
    expect(error.title).toBe('Conflicto de estado');
    expect(error.reference).toBe('FLOW-VEHICLE-01');
    expect(error.status).toBe(409);

    const [toast] = notifications.toasts();
    expect(toast.message).toBe(error.message);
    expect(toast.tone).toBe('error');
    expect(toast.reference).toBe('FLOW-VEHICLE-01');
    expect(toast.action?.label).toBe('Reintentar');
  });

  it('traduce los errores de validación del orchestrator a un mensaje accionable', async () => {
    const error = await failRequest({ error: 'bad_request', messages: ['customerId: must not be blank'] }, 400);

    expect(error.message).toBe('Revisa los datos ingresados: must not be blank');
    expect(error.title).toBe('Revisa los datos');
  });

  it('usa details cuando el backend no envía message', async () => {
    const error = await failRequest(
      { details: [{ field: 'vehicleId', message: 'debe estar disponible' }] },
      422,
    );

    expect(error.message).toBe('Revisa vehicleId: debe estar disponible');
  });

  it('nunca muestra cuerpos crudos ni códigos HTTP al usuario', async () => {
    const error = await failRequest('<html>Internal Server Error</html>', 500, 'Internal Server Error');

    expect(error.message).toBe('Ocurrió un error en el servidor. Intenta nuevamente en unos minutos.');
    expect(error.message).not.toContain('500');
    expect(error.message).not.toContain('<html>');
  });

  it('informa cuando no hay conexión con el servidor', async () => {
    const error = await failRequest(null, 0, 'Unknown Error');

    expect(error.title).toBe('Sin conexión');
    expect(error.message).toContain('Revisa tu conexión');
  });

  it('omite el toast global cuando la vista maneja el error en línea', async () => {
    await failRequest(
      { message: 'No pudimos cargar las ejecuciones.' },
      500,
      'Server Error',
      { context: silentErrorOptions().context },
    );

    expect(notifications.toasts()).toHaveLength(0);
  });

  it('adjunta la acción Reintentar solo a peticiones idempotentes', async () => {
    await failRequest({ message: 'Falló la consulta.' }, 500, 'Server Error');
    await failRequest({ message: 'No se pudo iniciar el proceso.' }, 500, 'Server Error', {
      method: 'POST',
    });

    const [getToast, postToast] = notifications.toasts();
    expect(getToast.action?.label).toBe('Reintentar');
    expect(postToast.action).toBeUndefined();
  });

  it('la acción Reintentar vuelve a ejecutar la petición', async () => {
    await failRequest({ message: 'No pudimos cargar los datos.' }, 500, 'Server Error');

    const toast = notifications.toasts()[0];
    notifications.runAction(toast.id);

    const retry = httpMock.expectOne('/api/processes');
    retry.flush([]);

    expect(notifications.toasts()).toHaveLength(0);
  });

  it('mantiene el contexto silencioso al inspeccionar la petición', () => {
    http.get('/api/processes', silentErrorOptions()).subscribe();
    const req = httpMock.expectOne('/api/processes');
    expect(req.request.context.get(SILENT_ERROR_TOAST)).toBe(true);
    req.flush([]);
  });

  it('normaliza errores que no provienen de HTTP', () => {
    const error = toUserFacingError(new Error('boom'));
    expect(error.message).toBe('Ocurrió un error inesperado. Intenta nuevamente.');
    expect(error.status).toBeNull();
  });

  it('ignora códigos técnicos disfrazados de mensaje', () => {
    expect(extractBackendMessage({ message: 'Error 500' })).toBeNull();
    expect(extractBackendMessage({ message: '   ' })).toBeNull();
    expect(extractBackendMessage(null)).toBeNull();
  });

  it.each([
    [401, 'Sesión requerida'],
    [403, 'Acceso denegado'],
    [404, 'No encontrado'],
    [429, 'Demasiadas solicitudes'],
    [418, 'Algo salió mal'],
  ])('traduce el estado %i a un título comprensible', async (status, title) => {
    const error = await failRequest(null, status);

    expect(error.title).toBe(title);
    expect(error.message).not.toContain(String(status));
  });

  it('muestra un nuevo aviso amigable si el reintento vuelve a fallar', async () => {
    await failRequest({ message: 'No pudimos cargar los datos.' }, 500, 'Server Error');

    notifications.runAction(notifications.toasts()[0].id);
    const retry = httpMock.expectOne('/api/processes');
    retry.flush({ message: 'El servicio sigue sin responder.' }, { status: 500, statusText: 'Server Error' });

    const messages = notifications.toasts().map((toast) => toast.message);
    expect(messages).toContain('El servicio sigue sin responder.');
  });

  it('descarta mensajes que parecen cuerpos técnicos', () => {
    expect(extractBackendMessage({ message: '{"traceId":"abc"}' })).toBeNull();
    expect(extractBackendMessage({ message: '[ERROR] boom' })).toBeNull();
    expect(extractBackendMessage({ message: 'x'.repeat(501) })).toBeNull();
    expect(extractBackendMessage({ messages: ['Error 500', 'customerId: requerido'] })).toBe(
      'Revisa los datos ingresados: requerido',
    );
    expect(extractBackendMessage({ details: [{ field: 'email', message: 'no es válido' }] })).toBe(
      'Revisa email: no es válido',
    );
    expect(extractBackendMessage({ details: [{ field: 'email', message: 'Error 500' }] })).toBeNull();
    expect(extractBackendMessage({ error: 'bad_request' })).toBeNull();
  });
});
