import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ShieldAlert, ShieldStats } from '../interfaces/shield.interface';

@Injectable({ providedIn: 'root' })
export class ShieldService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api';

  getAlerts(): Observable<ShieldAlert[]> {
    return this.http.get<ShieldAlert[]>(`${this.baseUrl}/shield/alerts`);
  }

  getAlert(id: string): Observable<ShieldAlert> {
    return this.http.get<ShieldAlert>(`${this.baseUrl}/shield/alerts/${id}`);
  }

  resolveAlert(id: string): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/shield/alerts/${id}/resolve`, {});
  }

  getStats(): Observable<ShieldStats> {
    return this.http.get<ShieldStats>(`${this.baseUrl}/shield/stats`);
  }
}
