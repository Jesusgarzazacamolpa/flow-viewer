import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { InterventionRequest, InterventionResponse, ProcessExecutionResponse, ProcessExecutionStepResponse } from '../interfaces/process.models';
import { silentErrorOptions } from '../interceptors/http-error.interceptor';

@Injectable({ providedIn: 'root' })
export class ControlCenterService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api';

  private readonly loading = signal(false);
  private readonly error = signal<string | null>(null);

  readonly isLoading = this.loading.asReadonly();
  readonly requestError = this.error.asReadonly();

  getDefaultTemplate(silentError = false): Observable<{ id: string }> {
    return this.http.get<{ id: string }>(
      `${this.baseUrl}/process-templates/default`,
      silentError ? silentErrorOptions() : undefined,
    );
  }

  startProcess(request: {
    processTemplateId: string;
    flowId?: string;
    customerId?: string;
    vehicleId?: string;
    salesAgentId?: string;
  }): Observable<ProcessExecutionResponse> {
    const body = {
      processTemplateId: request.processTemplateId,
      customerId: request.customerId ?? 'customer-001',
      vehicleId: request.vehicleId ?? 'vehicle-123',
      salesAgentId: request.salesAgentId ?? 'agent-77',
      flowId: request.flowId ?? 'compra-vehiculo'
    };
    return this.http.post<ProcessExecutionResponse>(`${this.baseUrl}/processes/start`, body);
  }

  listProcesses(silentError = false): Observable<ProcessExecutionResponse[]> {
    return this.http.get<ProcessExecutionResponse[]>(
      `${this.baseUrl}/processes`,
      silentError ? silentErrorOptions() : undefined,
    );
  }

  getProcess(id: string, silentError = false): Observable<ProcessExecutionResponse> {
    return this.http.get<ProcessExecutionResponse>(
      `${this.baseUrl}/processes/${id}`,
      silentError ? silentErrorOptions() : undefined,
    );
  }

  getProcessSteps(id: string, silentError = false): Observable<ProcessExecutionStepResponse[]> {
    return this.http.get<ProcessExecutionStepResponse[]>(
      `${this.baseUrl}/processes/${id}/steps`,
      silentError ? silentErrorOptions() : undefined,
    );
  }

  retryProcess(id: string, userInput?: string): Observable<ProcessExecutionResponse> {
    const params = userInput ? { userInput } : undefined;
    return this.http.post<ProcessExecutionResponse>(
      `${this.baseUrl}/processes/${id}/retry`, {}, { params }
    );
  }

  retryStep(id: string, stepOrder: number): Observable<ProcessExecutionResponse> {
    return this.http.post<ProcessExecutionResponse>(
      `${this.baseUrl}/processes/${id}/steps/${stepOrder}/retry`, {}
    );
  }

  listInterventions(status?: string, silentError = false): Observable<InterventionResponse[]> {
    return this.http.get<InterventionResponse[]>(`${this.baseUrl}/interventions`, {
      params: status ? { status } : undefined,
      ...(silentError ? silentErrorOptions() : {}),
    });
  }

  getIntervention(id: string, silentError = false): Observable<InterventionResponse> {
    return this.http.get<InterventionResponse>(
      `${this.baseUrl}/interventions/${id}`,
      silentError ? silentErrorOptions() : undefined,
    );
  }

  updateIntervention(id: string, request: InterventionRequest): Observable<InterventionResponse> {
    return this.http.put<InterventionResponse>(`${this.baseUrl}/interventions/${id}`, request);
  }

  assignIntervention(id: string, assignee: string): Observable<InterventionResponse> {
    return this.http.patch<InterventionResponse>(
      `${this.baseUrl}/interventions/${id}/assign`,
      { assignee }
    );
  }

  resumeIntervention(id: string, notes?: string): Observable<InterventionResponse> {
    return this.updateIntervention(id, { status: 'RESUME', notes });
  }
}
