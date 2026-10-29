/**
 * Servicio o producto adicional del catálogo comercial, mostrado como opción
 * al configurar un flujo.
 */
export interface Service {
  id: string;
  code: string;
  name: string;
  description?: string;
  basePrice: number;
  isActive: boolean;
  category: string;
  createdAt: string;
  updatedAt: string;
}
