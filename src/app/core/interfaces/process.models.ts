export interface ProcessExecutionResponse {
  id: string;
  processTemplateId: string;
  customerId?: string;
  status: string;
  currentStep?: string;
  errorMessage?: string;
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
  timestamp: string;
}

export interface ProcessTemplate {
  id: string;
  name: string;
}
