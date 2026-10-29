/**
 * Modelos de ejecución compartidos por el dashboard, el diálogo de progreso y
 * el stream SSE: ejecuciones, pasos, eventos e intervenciones.
 */

/** Ejecución de proceso con estado, paso actual y datos de error listos para la UI. */
export interface ProcessExecutionResponse {
  id: string;
  processTemplateId: string;
  customerId?: string;
  status: string;
  currentStep?: string;
  errorMessage?: string;
  /** Detalle técnico para diagnóstico; no debe mostrarse al usuario final. */
  devErrorLog?: string;
  userErrorTitle?: string;
  userErrorMessage?: string;
  userErrorActionLabel?: string;
  traceId?: string;
  steps: string[];
}

/** Página de ejecuciones con el formato `content/totalElements` del backend. */
export interface ProcessExecutionPage {
  content: ProcessExecutionResponse[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

/** Paso de una ejecución con su estado, reintentos y marcas de tiempo. */
export interface ProcessExecutionStepResponse {
  id: string;
  stepOrder: number;
  name: string;
  status: string;
  /** Reintentos acumulados del paso. */
  retryCount: number;
  errorMessage?: string;
  startedAt?: string;
  completedAt?: string;
}

/** Evento SSE emitido durante la ejecución; alimenta la bitácora en tiempo real. */
export interface FlowExecutionEvent {
  executionId: string;
  flowId: string;
  /** Tipo de evento (p. ej. STEP_STARTED o FLOW_COMPLETED). */
  eventType: string;
  stepOrder?: number;
  stepName?: string;
  toolName?: string;
  server?: string;
  status?: string;
  errorMessage?: string;
  userErrorTitle?: string;
  userErrorMessage?: string;
  userErrorActionLabel?: string;
  userErrorStatusType?: string;
  traceId?: string;
  timestamp: string;
}

/** Plantilla de proceso resuelta por nombre para iniciar un flujo. */
export interface ProcessTemplate {
  id: string;
  name: string;
}

/** Intervención devuelta por control-center, con datos de error y resolución. */
export interface InterventionResponse {
  id: string;
  processId: string;
  stepName: string;
  stepOrder: number;
  /** Estatus persistido: PENDING_REVIEW, APPROVED o REJECTED. */
  status: string;
  errorMessage?: string;
  userErrorTitle?: string;
  userErrorMessage?: string;
  userErrorActionLabel?: string;
  traceId?: string;
  assignedTo?: string;
  resolutionNotes?: string;
  suggestedAction?: string;
  createdAt: string;
  updatedAt: string;
}

/** Cuerpo para actualizar una intervención; el backend exige APPROVED o REJECTED. */
export interface InterventionRequest {
  status: string;
  notes?: string;
  assignee?: string;
}
