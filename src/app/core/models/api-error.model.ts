/**
 * Contratos de error del backend y el error normalizado que consume la UI.
 */

/** Violación de un campo concreto devuelta por la validación del backend. */
export interface BackendFieldViolation {
  field: string;
  message: string;
}

/**
 * Contrato de error compartido por control-center y orchestrator.
 * `message` es apto para mostrarse al usuario; el detalle técnico queda en logs.
 */
export interface BackendApiError {
  flowCode?: string;
  message?: string;
  traceId?: string;
  timestamp?: string;
  path?: string;
  details?: BackendFieldViolation[];
  error?: string;
  messages?: string[];
}

/** Datos para construir un UserFacingError: título, mensaje, estado y referencia. */
export interface UserFacingErrorOptions {
  title: string;
  message: string;
  status?: number | null;
  reference?: string;
}

/**
 * Error normalizado por el interceptor HTTP. Expone un mensaje listo para la UI
 * y nunca incluye códigos HTTP ni cuerpos crudos en `message`.
 */
export class UserFacingError extends Error {
  readonly title: string;
  readonly status: number | null;
  readonly reference?: string;

  /** Crea el error con mensaje visible y metadatos opcionales para soporte. */
  constructor({ title, message, status = null, reference }: UserFacingErrorOptions) {
    super(message);
    this.name = 'UserFacingError';
    this.title = title;
    this.status = status;
    this.reference = reference;
  }
}
