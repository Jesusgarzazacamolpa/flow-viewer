/**
 * Vehículo del catálogo del orchestrator; los identificadores conservan el
 * formato snake_case que devuelve el backend.
 */
export interface Vehicle {
  available: boolean;
  brand: string;
  currency: string;
  model: string;
  /** Identificador del modelo en el catálogo externo. */
  model_id: string;
  price: number;
  /** Identificador del vehículo en el catálogo externo. */
  vehicle_id: string;
}
