/**
 * Intervención humana sobre un paso del proceso, tal como la expone el
 * control-center.
 */
export interface HumanIntervention {
  id: string;
  processId: string;
  stepName: string;
  stepOrder: number;
  /** Estatus persistido; el backend usa PENDING_REVIEW, APPROVED y REJECTED. */
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  errorMessage: string;
  createdAt: string;
  updatedAt: string;
  assignedTo?: string;
  resolutionNotes?: string;
  /** Acción sugerida por el sistema para resolver la intervención. */
  suggestedAction?: string;
}

/** Cuerpo para reanudar (RESUME) o cancelar (CANCEL); el backend solo admite APPROVED/REJECTED. */
export interface HumanInterventionRequest {
  status: 'RESUME' | 'CANCEL';
  notes?: string;
}
