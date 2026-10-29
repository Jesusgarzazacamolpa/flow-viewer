/**
 * Contrato mínimo para iniciar un proceso; la app consume en su lugar la
 * versión ampliada de `process.models.ts`.
 */

/** Datos para arrancar un flujo; solo `processTemplateId` es obligatorio. */
export interface StartProcessRequest {
  processTemplateId: string;
  flowId?: string;
  customerId?: string;
  vehicleId?: string;
  salesAgentId?: string;
}

/** Respuesta inmediata al iniciar: estado, paso actual y nombres de pasos. */
export interface ProcessExecutionResponse {
  id: string;
  processTemplateId: string;
  customerId: string;
  status: string;
  currentStep?: string;
  errorMessage?: string;
  steps: string[];
}
