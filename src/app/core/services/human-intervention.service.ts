import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HumanIntervention, HumanInterventionRequest } from '../interfaces/intervention.interface';
import { silentErrorOptions } from '../interceptors/http-error.interceptor';

/**
 * Cliente de las intervenciones humanas en `/api/interventions`, usado por la
 * vista de intervenciones; solapa endpoints con ControlCenterService.
 */
@Injectable({ providedIn: 'root' })
export class HumanInterventionService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api';

  /** Lista todas las intervenciones (`GET /api/interventions`). */
  getInterventions(silentError = false): Observable<HumanIntervention[]> {
    return this.http.get<HumanIntervention[]>(
      `${this.baseUrl}/interventions`,
      silentError ? silentErrorOptions() : undefined,
    );
  }

  /** Recupera una intervención por id (`GET /api/interventions/{id}`). */
  getIntervention(id: string): Observable<HumanIntervention> {
    return this.http.get<HumanIntervention>(`${this.baseUrl}/interventions/${id}`);
  }

  /** Cambia estado y notas de la intervención (`PUT /api/interventions/{id}`). */
  updateIntervention(id: string, request: HumanInterventionRequest): Observable<HumanIntervention> {
    return this.http.put<HumanIntervention>(`${this.baseUrl}/interventions/${id}`, request);
  }

  /** Asigna la intervención a un responsable (`PATCH /api/interventions/{id}/assign`). */
  assignToMe(id: string, assignee: string): Observable<HumanIntervention> {
    return this.http.patch<HumanIntervention>(`${this.baseUrl}/interventions/${id}/assign`, { assignee });
  }
}
