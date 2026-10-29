import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { InterventionRequest, InterventionResponse, ProcessExecutionPage, ProcessExecutionResponse, ProcessExecutionStepResponse } from '../interfaces/process.models';
import { silentErrorOptions } from '../interceptors/http-error.interceptor';

/** Filtros opcionales para listar intervenciones por estado y proceso. */
export interface InterventionFilters {
  status?: string;
  processId?: string;
}

/**
 * Cliente del control-center (`/api`) para plantillas, ejecuciones, pasos e
 * intervenciones; `silentError` omite el toast global en las lecturas.
 * Expone isLoading/requestError, aunque hoy ninguna petición los actualiza.
 */
@Injectable({ providedIn: 'root' })
export class ControlCenterService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api';

  private readonly loading = signal(false);
  private readonly error = signal<string | null>(null);

  readonly isLoading = this.loading.asReadonly();
  readonly requestError = this.error.asReadonly();

  /** Obtiene la plantilla por defecto del control-center (`GET /api/process-templates/default`). */
  getDefaultTemplate(silentError = false): Observable<{ id: string }> {
    return this.http.get<{ id: string }>(
      `${this.baseUrl}/process-templates/default`,
      silentError ? silentErrorOptions() : undefined,
    );
  }

  /** Resuelve una plantilla por nombre (`GET /api/process-templates/by-name?name=`). */
  getTemplateByName(name: string, silentError = false): Observable<{ id: string }> {
    return this.http.get<{ id: string }>(`${this.baseUrl}/process-templates/by-name`, {
      params: { name },
      ...(silentError ? silentErrorOptions() : {}),
    });
  }

  /**
   * Inicia un proceso (`POST /api/processes/start`); si faltan ids usa valores
   * demo (`customer-001`, `vehicle-123`, `agent-77`, `compra-vehiculo`).
   */
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

  /** Lista las ejecuciones paginadas (`GET /api/processes?page=&size=`). */
  listProcesses(page = 0, size = 10, silentError = false): Observable<ProcessExecutionPage> {
    return this.http.get<ProcessExecutionPage>(`${this.baseUrl}/processes`, {
      params: { page, size },
      ...(silentError ? silentErrorOptions() : {}),
    });
  }

  /** Recupera una ejecución por id (`GET /api/processes/{id}`). */
  getProcess(id: string, silentError = false): Observable<ProcessExecutionResponse> {
    return this.http.get<ProcessExecutionResponse>(
      `${this.baseUrl}/processes/${id}`,
      silentError ? silentErrorOptions() : undefined,
    );
  }

  /** Obtiene los pasos de una ejecución (`GET /api/processes/{id}/steps`). */
  getProcessSteps(id: string, silentError = false): Observable<ProcessExecutionStepResponse[]> {
    return this.http.get<ProcessExecutionStepResponse[]>(
      `${this.baseUrl}/processes/${id}/steps`,
      silentError ? silentErrorOptions() : undefined,
    );
  }

  /** Reintenta el proceso completo (`POST /api/processes/{id}/retry`), con `userInput` opcional. */
  retryProcess(id: string, userInput?: string): Observable<ProcessExecutionResponse> {
    const params = userInput ? { userInput } : undefined;
    return this.http.post<ProcessExecutionResponse>(
      `${this.baseUrl}/processes/${id}/retry`, {}, { params }
    );
  }

  /** Reintenta un paso concreto (`POST /api/processes/{id}/steps/{stepOrder}/retry`). */
  retryStep(id: string, stepOrder: number): Observable<ProcessExecutionResponse> {
    return this.http.post<ProcessExecutionResponse>(
      `${this.baseUrl}/processes/${id}/steps/${stepOrder}/retry`, {}
    );
  }

  /** Lista intervenciones (`GET /api/interventions`), filtrables por estado y proceso. */
  listInterventions(filters: InterventionFilters = {}, silentError = false): Observable<InterventionResponse[]> {
    const params: Record<string, string> = {};
    if (filters.status) params['status'] = filters.status;
    if (filters.processId) params['processId'] = filters.processId;
    return this.http.get<InterventionResponse[]>(`${this.baseUrl}/interventions`, {
      params,
      ...(silentError ? silentErrorOptions() : {}),
    });
  }

  /** Recupera una intervención por id (`GET /api/interventions/{id}`). */
  getIntervention(id: string, silentError = false): Observable<InterventionResponse> {
    return this.http.get<InterventionResponse>(
      `${this.baseUrl}/interventions/${id}`,
      silentError ? silentErrorOptions() : undefined,
    );
  }

  /** Actualiza estado y notas de una intervención (`PUT /api/interventions/{id}`). */
  updateIntervention(id: string, request: InterventionRequest): Observable<InterventionResponse> {
    return this.http.put<InterventionResponse>(`${this.baseUrl}/interventions/${id}`, request);
  }

  /** Asigna la intervención a un responsable (`PATCH /api/interventions/{id}/assign`). */
  assignIntervention(id: string, assignee: string): Observable<InterventionResponse> {
    return this.http.patch<InterventionResponse>(
      `${this.baseUrl}/interventions/${id}/assign`,
      { assignee }
    );
  }

  /** Aprueba la intervención y reanuda el proceso (`PUT` con estado `APPROVED`). */
  resumeIntervention(id: string, notes?: string): Observable<InterventionResponse> {
    return this.updateIntervention(id, { status: 'APPROVED', notes });
  }

  /** Rechaza la intervención y cancela el proceso (`PUT` con estado `REJECTED`). */
  rejectIntervention(id: string, notes?: string): Observable<InterventionResponse> {
    return this.updateIntervention(id, { status: 'REJECTED', notes });
  }
}
