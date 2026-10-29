import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Vehicle } from '../interfaces/vehicle.interface';
import { Agent } from '../interfaces/agent.interface';
import { Customer } from '../interfaces/customer.interface';
import { Service } from '../interfaces/service.interface';
import { ApiResponse, PaginatedResponse } from '../interfaces/common.interface';
import { silentErrorOptions } from '../interceptors/http-error.interceptor';

/** Valor admitido en la query string; los vacíos o indefinidos se omiten. */
type QueryValue = string | number | boolean | undefined;

/**
 * Cliente de los catálogos de dominio del orchestrator (`/api/orchestrator`):
 * vehículos, agentes, clientes y servicios usados por el dashboard.
 * `silentError` omite el toast global para que la vista muestre el error en línea.
 */
@Injectable({ providedIn: 'root' })
export class OrchestratorService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/orchestrator';

  /** Lista vehículos paginados (`GET /api/orchestrator/vehicles`). */
  getVehicles(
    params: { page?: number; pageSize?: number; status?: string; search?: string } = {},
    silentError = false,
  ): Observable<PaginatedResponse<Vehicle>> {
    return this.get('/vehicles', { ...params }, silentError);
  }

  /** Vehículos disponibles (`GET /api/orchestrator/vehicles/available`). */
  getAvailableVehicles(silentError = false): Observable<ApiResponse<Vehicle[]>> {
    return this.get('/vehicles/available', {}, silentError);
  }

  /** Lista agentes paginados (`GET /api/orchestrator/agents`). */
  getAgents(
    params: { page?: number; pageSize?: number; specialization?: string; isActive?: boolean; search?: string } = {},
    silentError = false,
  ): Observable<PaginatedResponse<Agent>> {
    return this.get('/agents', { ...params }, silentError);
  }

  /** Agentes activos (`GET /api/orchestrator/agents/active`). */
  getActiveAgents(silentError = false): Observable<Agent[]> {
    return this.get('/agents/active', {}, silentError);
  }

  /** Agentes de ventas de vehículos nuevos (`GET /api/orchestrator/agents/specialization/VENTAS_NUEVOS`). */
  getSalesAgents(silentError = false): Observable<ApiResponse<Agent[]>> {
    return this.get('/agents/specialization/VENTAS_NUEVOS', {}, silentError);
  }

  /** Lista clientes paginados (`GET /api/orchestrator/customers`). */
  getCustomers(
    params: { page?: number; pageSize?: number; isActive?: boolean; search?: string } = {},
    silentError = false,
  ): Observable<PaginatedResponse<Customer>> {
    return this.get('/customers', { ...params }, silentError);
  }

  /** Clientes activos (`GET /api/orchestrator/customers/active`). */
  getActiveCustomers(silentError = false): Observable<ApiResponse<Customer[]>> {
    return this.get('/customers/active', {}, silentError);
  }

  /** Busca clientes por nombre (`GET /api/orchestrator/customers/search?name=`). */
  searchCustomers(name: string, silentError = false): Observable<Customer[]> {
    return this.get('/customers/search', { name }, silentError);
  }

  /** Lista servicios paginados (`GET /api/orchestrator/services`). */
  getServices(
    params: { page?: number; pageSize?: number; category?: string; isActive?: boolean; search?: string } = {},
    silentError = false,
  ): Observable<PaginatedResponse<Service>> {
    return this.get('/services', { ...params }, silentError);
  }

  /** Servicios activos (`GET /api/orchestrator/services/active`). */
  getActiveServices(silentError = false): Observable<Service[]> {
    return this.get('/services/active', {}, silentError);
  }

  /** Servicios de venta (`GET /api/orchestrator/services/sales`). */
  getSalesServices(silentError = false): Observable<ApiResponse<Service[]>> {
    return this.get('/services/sales', {}, silentError);
  }

  /** GET genérico que arma la query omitiendo valores vacíos o indefinidos. */
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
