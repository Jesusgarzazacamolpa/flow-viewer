import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ShieldAlert, ShieldStats } from '../interfaces/shield.interface';
import { silentErrorOptions } from '../interceptors/http-error.interceptor';

/**
 * Cliente del módulo Shield (`/api/shield`): alertas de seguridad y sus
 * estadísticas agregadas. `silentError` omite el toast global en las lecturas.
 */
@Injectable({ providedIn: 'root' })
export class ShieldService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api';

  /** Lista todas las alertas (`GET /api/shield/alerts`). */
  getAlerts(silentError = false): Observable<ShieldAlert[]> {
    return this.http.get<ShieldAlert[]>(
      `${this.baseUrl}/shield/alerts`,
      silentError ? silentErrorOptions() : undefined,
    );
  }

  /** Recupera una alerta por id (`GET /api/shield/alerts/{id}`). */
  getAlert(id: string, silentError = false): Observable<ShieldAlert> {
    return this.http.get<ShieldAlert>(
      `${this.baseUrl}/shield/alerts/${id}`,
      silentError ? silentErrorOptions() : undefined,
    );
  }

  /** Marca una alerta como resuelta (`POST /api/shield/alerts/{id}/resolve`). */
  resolveAlert(id: string): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/shield/alerts/${id}/resolve`, {});
  }

  /** Obtiene los totales de alertas (`GET /api/shield/stats`). */
  getStats(silentError = false): Observable<ShieldStats> {
    return this.http.get<ShieldStats>(
      `${this.baseUrl}/shield/stats`,
      silentError ? silentErrorOptions() : undefined,
    );
  }
}
