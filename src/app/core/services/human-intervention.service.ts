import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HumanIntervention, HumanInterventionRequest } from '../interfaces/intervention.interface';
import { silentErrorOptions } from '../interceptors/http-error.interceptor';

@Injectable({ providedIn: 'root' })
export class HumanInterventionService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api';

  getInterventions(silentError = false): Observable<HumanIntervention[]> {
    return this.http.get<HumanIntervention[]>(
      `${this.baseUrl}/interventions`,
      silentError ? silentErrorOptions() : undefined,
    );
  }

  getIntervention(id: string): Observable<HumanIntervention> {
    return this.http.get<HumanIntervention>(`${this.baseUrl}/interventions/${id}`);
  }

  updateIntervention(id: string, request: HumanInterventionRequest): Observable<HumanIntervention> {
    return this.http.put<HumanIntervention>(`${this.baseUrl}/interventions/${id}`, request);
  }

  assignToMe(id: string, assignee: string): Observable<HumanIntervention> {
    return this.http.patch<HumanIntervention>(`${this.baseUrl}/interventions/${id}/assign`, { assignee });
  }
}
