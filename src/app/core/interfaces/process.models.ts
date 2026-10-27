export interface ProcessExecutionResponse {
  id: string;
  processTemplateId: string;
  customerId?: string;
  status: string;
  currentStep?: string;
  errorMessage?: string;
  devErrorLog?: string;
  userErrorTitle?: string;
  userErrorMessage?: string;
  userErrorActionLabel?: string;
  traceId?: string;
  steps: string[];
}

export interface ProcessExecutionStepResponse {
  id: string;
  stepOrder: number;
  name: string;
  status: string;
  retryCount: number;
  errorMessage?: string;
  startedAt?: string;
  completedAt?: string;
}

export interface FlowExecutionEvent {
  executionId: string;
  flowId: string;
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

export interface ProcessTemplate {
  id: string;
  name: string;
}

export interface InterventionResponse {
  id: string;
  processId: string;
  stepName: string;
  stepOrder: number;
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

export interface InterventionRequest {
  status: string;
  notes?: string;
  assignee?: string;
}
