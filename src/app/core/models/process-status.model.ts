/**
 * Centraliza la interpretación de los estados de proceso: normalización,
 * etiquetas visibles y tonos de color compartidos por dashboard y diálogo.
 */

/** Tono semántico con el que se pinta el estado de un proceso. */
export type ProcessProgressTone = 'success' | 'danger' | 'warning' | 'info' | 'muted';

/** Clases Tailwind de color de texto asociadas a cada tono. */
const TONE_CLASSES: Record<ProcessProgressTone, string> = {
  success: 'text-green-500',
  danger: 'text-red-500',
  warning: 'text-amber-500',
  info: 'text-sky-500',
  muted: 'text-slate-500',
};

/** Normaliza el estado a mayúsculas sin espacios; devuelve null si viene vacío o ausente. */
export function normalizeProcessStatus(status: string | null | undefined): string | null {
  const normalized = status?.trim().toUpperCase();
  return normalized ? normalized : null;
}

/** Indica si el proceso está ejecutándose (acepta IN_PROGRESS y RUNNING). */
export function isProcessInProgress(status: string | null | undefined): boolean {
  const normalized = normalizeProcessStatus(status);
  return normalized === 'IN_PROGRESS' || normalized === 'RUNNING';
}

/** Indica si el proceso espera una intervención humana (PAUSED_FOR_HUMAN). */
export function isProcessPaused(status: string | null | undefined): boolean {
  return normalizeProcessStatus(status) === 'PAUSED_FOR_HUMAN';
}

/** Indica si el proceso terminó con error (FAILED o ERROR); CANCELLED no cuenta como fallo. */
export function isProcessFailed(status: string | null | undefined): boolean {
  const normalized = normalizeProcessStatus(status);
  return normalized === 'FAILED' || normalized === 'ERROR';
}

/**
 * Traduce el estado a un tono visual. CANCELLED usa `danger` porque es un cierre
 * no exitoso que requiere atención, aunque no sea un fallo técnico.
 */
export function resolveProgressTone(status: string | null | undefined): ProcessProgressTone {
  switch (normalizeProcessStatus(status)) {
    case 'COMPLETED':
      return 'success';
    case 'FAILED':
    case 'ERROR':
    case 'CANCELLED':
      return 'danger';
    case 'PAUSED_FOR_HUMAN':
      return 'warning';
    case 'IN_PROGRESS':
    case 'RUNNING':
      return 'info';
    default:
      return 'muted';
  }
}

/** Devuelve la clase Tailwind de texto para el tono indicado. */
export function progressToneClass(tone: ProcessProgressTone): string {
  return TONE_CLASSES[tone];
}

/**
 * Construye la etiqueta visible del estado; para estados en curso usa el avance
 * (`completados de total`) y para los terminales un texto fijo.
 */
export function resolveProgressLabel(
  status: string | null | undefined,
  completedSteps: number,
  totalSteps: number,
): string {
  switch (normalizeProcessStatus(status)) {
    case 'COMPLETED':
      return '¡Proceso completado!';
    case 'FAILED':
    case 'ERROR':
      return 'Falló el proceso';
    case 'CANCELLED':
      return 'Proceso cancelado';
    case 'PAUSED_FOR_HUMAN':
      return `${completedSteps} de ${totalSteps} pasos · En espera de intervención`;
    case 'PENDING':
      return 'Pendiente de iniciar';
    default:
      return `${completedSteps} de ${totalSteps} pasos completados`;
  }
}
