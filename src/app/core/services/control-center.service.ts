import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { ProcessExecutionResponse, ProcessExecutionStepResponse } from '../interfaces/process.models';

@Injectable({ providedIn: 'root' })
export class ControlCenterService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api';

  private readonly loading = signal(false);
  private readonly error = signal<string | null>(null);

  readonly isLoading = this.loading.asReadonly();
  readonly requestError = this.error.asReadonly();

  getDefaultTemplate(): Observable<{ id: string }> {
    return this.http.get<{ id: string }>(`${this.baseUrl}/process-templates/default`);
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

  listProcesses(): Observable<ProcessExecutionResponse[]> {
    return this.http.get<ProcessExecutionResponse[]>(`${this.baseUrl}/processes`);
  }

  getProcess(id: string): Observable<ProcessExecutionResponse> {
    return this.http.get<ProcessExecutionResponse>(`${this.baseUrl}/processes/${id}`);
  }

   getProcessSteps(id: string): Observable<ProcessExecutionStepResponse[]> {
    return this.http.get<ProcessExecutionStepResponse[]>(`${this.baseUrl}/processes/${id}/steps`);
  }

  retryProcess(id: string): Observable<ProcessExecutionResponse> {
    return this.http.patch<ProcessExecutionResponse>(
      `${this.baseUrl}/processes/${id}/status`,
      { status: 'IN_PROGRESS', currentStep: '', errorMessage: '' }
    );
  }
}
