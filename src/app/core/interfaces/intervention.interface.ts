export interface HumanIntervention {
  id: string;
  processId: string;
  stepName: string;
  stepOrder: number;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  errorMessage: string;
  createdAt: string;
  updatedAt: string;
  assignedTo?: string;
  resolutionNotes?: string;
  suggestedAction?: string;
}

export interface HumanInterventionRequest {
  status: 'RESUME' | 'CANCEL';
  notes?: string;
}
