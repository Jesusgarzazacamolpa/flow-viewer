import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ShieldAlert, ShieldStats } from '../interfaces/shield.interface';
import { silentErrorOptions } from '../interceptors/http-error.interceptor';

@Injectable({ providedIn: 'root' })
export class ShieldService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api';

  getAlerts(silentError = false): Observable<ShieldAlert[]> {
    return this.http.get<ShieldAlert[]>(
      `${this.baseUrl}/shield/alerts`,
      silentError ? silentErrorOptions() : undefined,
    );
  }

  getAlert(id: string, silentError = false): Observable<ShieldAlert> {
    return this.http.get<ShieldAlert>(
      `${this.baseUrl}/shield/alerts/${id}`,
      silentError ? silentErrorOptions() : undefined,
    );
  }

  resolveAlert(id: string): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/shield/alerts/${id}/resolve`, {});
  }

  getStats(silentError = false): Observable<ShieldStats> {
    return this.http.get<ShieldStats>(
      `${this.baseUrl}/shield/stats`,
      silentError ? silentErrorOptions() : undefined,
    );
  }
}
