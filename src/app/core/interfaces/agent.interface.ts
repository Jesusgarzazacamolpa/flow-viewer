/**
 * Agente comercial del dominio de orquestación; alimenta el selector de
 * asesores al iniciar un flujo.
 */
export interface Agent {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  licenseNumber: string;
  isActive: boolean;
  specialization: string;
}
