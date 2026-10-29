/**
 * Interceptor HTTP global: normaliza los errores del backend a UserFacingError,
 * muestra un toast con opción de reintento y permite silenciarlo por petición.
 */
import {
  HttpContext,
  HttpContextToken,
  HttpErrorResponse,
  HttpHandlerFn,
  HttpInterceptorFn,
  HttpRequest,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { BackendApiError, UserFacingError } from '../models/api-error.model';
import { NotificationService } from '../services/notification.service';

/**
 * Permite que una petición omita el toast global para que la vista muestre
 * el error en línea junto a un botón de reintento.
 */
export const SILENT_ERROR_TOAST = new HttpContextToken<boolean>(() => false);

/** Opciones de HttpClient que marcan la petición para no mostrar el toast global. */
export function silentErrorOptions(): { context: HttpContext } {
  return { context: new HttpContext().set(SILENT_ERROR_TOAST, true) };
}

/** Títulos cortos por código HTTP usados como cabecera del toast. */
const STATUS_TITLES: Record<number, string> = {
  0: 'Sin conexión',
  400: 'Revisa los datos',
  401: 'Sesión requerida',
  403: 'Acceso denegado',
  404: 'No encontrado',
  409: 'Conflicto de estado',
  422: 'Revisa los datos',
  429: 'Demasiadas solicitudes',
  500: 'Servicio no disponible',
  502: 'Servicio no disponible',
  503: 'Servicio no disponible',
  504: 'Servicio no disponible',
};

/**
 * Convierte cualquier error en UserFacingError y lo muestra como toast, salvo
 * que la petición use SILENT_ERROR_TOAST; en GET/HEAD ofrece reintentar.
 */
export const httpErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const notifications = inject(NotificationService);

  return next(req).pipe(
    catchError((error: unknown) => {
      const failure = toUserFacingError(error);

      if (!req.context.get(SILENT_ERROR_TOAST)) {
        notifications.error(failure.message, {
          title: failure.title,
          reference: failure.reference,
          action: canReplay(req) ? { label: 'Reintentar', run: () => replay(req, next, notifications) } : undefined,
        });
      }

      return throwError(() => failure);
    }),
  );
};

/** Normaliza un error desconocido o HttpErrorResponse a un mensaje apto para la UI. */
export function toUserFacingError(error: unknown): UserFacingError {
  if (error instanceof UserFacingError) {
    return error;
  }

  if (!(error instanceof HttpErrorResponse)) {
    return new UserFacingError({
      title: 'Algo salió mal',
      message: 'Ocurrió un error inesperado. Intenta nuevamente.',
    });
  }

  const payload = error.error as BackendApiError | string | null;
  const backendMessage = extractBackendMessage(payload);
  const status = error.status;

  return new UserFacingError({
    title: titleForStatus(status),
    message: backendMessage ?? messageForStatus(status),
    status,
    reference: extractReference(payload),
  });
}

/**
 * Extrae el mensaje más útil del cuerpo de error (`message`, `messages` o
 * `details`) y descarta texto que parezca técnico o no apto para el usuario.
 */
export function extractBackendMessage(payload: unknown): string | null {
  if (typeof payload === 'string') {
    return looksLikeUserMessage(payload) ? payload.trim() : null;
  }

  if (!isRecord(payload)) {
    return null;
  }

  const directMessage = payload['message'];
  if (typeof directMessage === 'string' && looksLikeUserMessage(directMessage)) {
    return directMessage.trim();
  }

  const messages = payload['messages'];
  if (Array.isArray(messages)) {
    const first = messages.find((item): item is string => typeof item === 'string' && looksLikeUserMessage(item));
    if (first) {
      const detail = first.includes(': ') ? first.slice(first.indexOf(': ') + 2) : first;
      return `Revisa los datos ingresados: ${detail}`;
    }
  }

  const details = payload['details'];
  if (Array.isArray(details)) {
    const firstDetail = details.find(
      (item): item is { field: string; message: string } =>
        isRecord(item) && typeof item['message'] === 'string' && looksLikeUserMessage(item['message']),
    );
    if (firstDetail) {
      return `Revisa ${firstDetail.field}: ${firstDetail.message}`;
    }
  }

  return null;
}

/** Usa `flowCode` como referencia visible para soporte, si viene en el cuerpo. */
function extractReference(payload: unknown): string | undefined {
  if (isRecord(payload) && typeof payload['flowCode'] === 'string' && payload['flowCode'].trim()) {
    return payload['flowCode'].trim();
  }
  return undefined;
}

/** Resuelve el título para el código HTTP, con fallback para 5xx y el resto. */
function titleForStatus(status: number): string {
  return STATUS_TITLES[status] ?? (status >= 500 ? 'Servicio no disponible' : 'Algo salió mal');
}

/** Mensaje genérico en español cuando el backend no aporta uno usable. */
function messageForStatus(status: number): string {
  switch (status) {
    case 0:
      return 'No pudimos conectar con el servidor. Revisa tu conexión e intenta nuevamente.';
    case 400:
    case 422:
      return 'Revisa los datos ingresados e intenta nuevamente.';
    case 401:
      return 'Tu sesión expiró o no es válida. Vuelve a iniciar sesión.';
    case 403:
      return 'No cuentas con los permisos necesarios para realizar esta acción.';
    case 404:
      return 'No encontramos la información solicitada. Verifica e intenta nuevamente.';
    case 409:
      return 'La acción no se pudo completar porque el estado cambió. Recarga e intenta nuevamente.';
    case 429:
      return 'Recibimos demasiadas solicitudes. Espera un momento y vuelve a intentar.';
    case 500:
    case 502:
    case 503:
    case 504:
      return 'Ocurrió un error en el servidor. Intenta nuevamente en unos minutos.';
    default:
      return status >= 400 && status < 500
        ? 'No pudimos completar la solicitud. Revisa los datos e intenta nuevamente.'
        : 'Ocurrió un error inesperado. Intenta nuevamente.';
  }
}

/** Descarta cadenas vacías, demasiado largas, HTML/JSON o volcados tipo "Error 500". */
function looksLikeUserMessage(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 500) {
    return false;
  }
  if (trimmed.startsWith('<') || trimmed.startsWith('{') || trimmed.startsWith('[')) {
    return false;
  }
  return !/^error\s+\d{3}/i.test(trimmed);
}

/** Solo GET/HEAD se pueden reintentar sin riesgo de duplicar efectos. */
function canReplay(req: HttpRequest<unknown>): boolean {
  return req.method === 'GET' || req.method === 'HEAD';
}

/** Repite la petición desde el botón del toast y avisa si vuelve a fallar. */
function replay(req: HttpRequest<unknown>, next: HttpHandlerFn, notifications: NotificationService): void {
  next(req).subscribe({
    error: (error: unknown) => {
      const failure = toUserFacingError(error);
      notifications.error(failure.message, {
        title: failure.title,
        reference: failure.reference,
      });
    },
  });
}

/** Comprueba que el valor sea un objeto no nulo antes de leerlo como registro. */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
