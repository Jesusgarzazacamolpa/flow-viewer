export interface StartProcessRequest {
  processTemplateId: string;
  flowId?: string;
  customerId?: string;
  vehicleId?: string;
  salesAgentId?: string;
}

export interface ProcessExecutionResponse {
  id: string;
  processTemplateId: string;
  customerId: string;
  status: string;
  currentStep?: string;
  errorMessage?: string;
  steps: string[];
}
