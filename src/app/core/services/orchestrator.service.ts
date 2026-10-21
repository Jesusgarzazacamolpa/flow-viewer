import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Vehicle } from '../interfaces/vehicle.interface';
import { Agent } from '../interfaces/agent.interface';
import { Customer } from '../interfaces/customer.interface';
import { Service } from '../interfaces/service.interface';
import { ApiResponse, PaginatedResponse } from '../interfaces/common.interface';

@Injectable({ providedIn: 'root' })
export class OrchestratorService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/orchestrator';

  // Vehicles
  getVehicles(params?: { page?: number; pageSize?: number; status?: string; search?: string }): Observable<PaginatedResponse<Vehicle>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.set('page', params.page.toString());
    if (params?.pageSize) queryParams.set('pageSize', params.pageSize.toString());
    if (params?.status) queryParams.set('status', params.status);
    if (params?.search) queryParams.set('search', params.search);
    return this.http.get<PaginatedResponse<Vehicle>>(`${this.baseUrl}/vehicles?${queryParams.toString()}`);
  }

  getAvailableVehicles(): Observable<ApiResponse<Vehicle[]>> {
    return this.http.get<ApiResponse<Vehicle[]>>(`${this.baseUrl}/vehicles/available`);
  }

  // Agents
  getAgents(params?: { page?: number; pageSize?: number; specialization?: string; isActive?: boolean; search?: string }): Observable<PaginatedResponse<Agent>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.set('page', params.page.toString());
    if (params?.pageSize) queryParams.set('pageSize', params.pageSize.toString());
    if (params?.specialization) queryParams.set('specialization', params.specialization);
    if (params?.isActive !== undefined) queryParams.set('isActive', params.isActive.toString());
    if (params?.search) queryParams.set('search', params.search);
    return this.http.get<PaginatedResponse<Agent>>(`${this.baseUrl}/agents?${queryParams.toString()}`);
  }

  getActiveAgents(): Observable<Agent[]> {
    return this.http.get<Agent[]>(`${this.baseUrl}/agents/active`);
  }

  getSalesAgents(): Observable<ApiResponse<Agent[]>> {
    return this.http.get<ApiResponse<Agent[]>>(`${this.baseUrl}/agents/specialization/VENTAS_NUEVOS`);
  }

  // Customers
  getCustomers(params?: { page?: number; pageSize?: number; isActive?: boolean; search?: string }): Observable<PaginatedResponse<Customer>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.set('page', params.page.toString());
    if (params?.pageSize) queryParams.set('pageSize', params.pageSize.toString());
    if (params?.isActive !== undefined) queryParams.set('isActive', params.isActive.toString());
    if (params?.search) queryParams.set('search', params.search);
    return this.http.get<PaginatedResponse<Customer>>(`${this.baseUrl}/customers?${queryParams.toString()}`);
  }

  getActiveCustomers(): Observable<ApiResponse<Customer[]>> {
    return this.http.get<ApiResponse<Customer[]>>(`${this.baseUrl}/customers/active`);
  }

  searchCustomers(name: string): Observable<Customer[]> {
    return this.http.get<Customer[]>(`${this.baseUrl}/customers/search?name=${encodeURIComponent(name)}`);
  }

  // Services
  getServices(params?: { page?: number; pageSize?: number; category?: string; isActive?: boolean; search?: string }): Observable<PaginatedResponse<Service>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.set('page', params.page.toString());
    if (params?.pageSize) queryParams.set('pageSize', params.pageSize.toString());
    if (params?.category) queryParams.set('category', params.category);
    if (params?.isActive !== undefined) queryParams.set('isActive', params.isActive.toString());
    if (params?.search) queryParams.set('search', params.search);
    return this.http.get<PaginatedResponse<Service>>(`${this.baseUrl}/services?${queryParams.toString()}`);
  }

  getActiveServices(): Observable<Service[]> {
    return this.http.get<Service[]>(`${this.baseUrl}/services/active`);
  }

  getSalesServices(): Observable<ApiResponse<Service[]>> {
    return this.http.get<ApiResponse<Service[]>>(`${this.baseUrl}/services/sales`);
  }
}