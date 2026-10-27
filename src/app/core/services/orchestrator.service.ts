import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Vehicle } from '../interfaces/vehicle.interface';
import { Agent } from '../interfaces/agent.interface';
import { Customer } from '../interfaces/customer.interface';
import { Service } from '../interfaces/service.interface';
import { ApiResponse, PaginatedResponse } from '../interfaces/common.interface';
import { silentErrorOptions } from '../interceptors/http-error.interceptor';

type QueryValue = string | number | boolean | undefined;

@Injectable({ providedIn: 'root' })
export class OrchestratorService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/orchestrator';

  getVehicles(
    params: { page?: number; pageSize?: number; status?: string; search?: string } = {},
    silentError = false,
  ): Observable<PaginatedResponse<Vehicle>> {
    return this.get('/vehicles', { ...params }, silentError);
  }

  getAvailableVehicles(silentError = false): Observable<ApiResponse<Vehicle[]>> {
    return this.get('/vehicles/available', {}, silentError);
  }

  getAgents(
    params: { page?: number; pageSize?: number; specialization?: string; isActive?: boolean; search?: string } = {},
    silentError = false,
  ): Observable<PaginatedResponse<Agent>> {
    return this.get('/agents', { ...params }, silentError);
  }

  getActiveAgents(silentError = false): Observable<Agent[]> {
    return this.get('/agents/active', {}, silentError);
  }

  getSalesAgents(silentError = false): Observable<ApiResponse<Agent[]>> {
    return this.get('/agents/specialization/VENTAS_NUEVOS', {}, silentError);
  }

  getCustomers(
    params: { page?: number; pageSize?: number; isActive?: boolean; search?: string } = {},
    silentError = false,
  ): Observable<PaginatedResponse<Customer>> {
    return this.get('/customers', { ...params }, silentError);
  }

  getActiveCustomers(silentError = false): Observable<ApiResponse<Customer[]>> {
    return this.get('/customers/active', {}, silentError);
  }

  searchCustomers(name: string, silentError = false): Observable<Customer[]> {
    return this.get('/customers/search', { name }, silentError);
  }

  getServices(
    params: { page?: number; pageSize?: number; category?: string; isActive?: boolean; search?: string } = {},
    silentError = false,
  ): Observable<PaginatedResponse<Service>> {
    return this.get('/services', { ...params }, silentError);
  }

  getActiveServices(silentError = false): Observable<Service[]> {
    return this.get('/services/active', {}, silentError);
  }

  getSalesServices(silentError = false): Observable<ApiResponse<Service[]>> {
    return this.get('/services/sales', {}, silentError);
  }

  private get<T>(path: string, query: Record<string, QueryValue>, silentError: boolean): Observable<T> {
    let params = new HttpParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        params = params.set(key, String(value));
      }
    });

    return this.http.get<T>(`${this.baseUrl}${path}`, {
      params,
      ...(silentError ? silentErrorOptions() : {}),
    });
  }
}
