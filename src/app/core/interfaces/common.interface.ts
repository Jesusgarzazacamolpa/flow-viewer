/**
 * Envoltorios genéricos de las respuestas del orchestrator: listas simples y
 * listas paginadas.
 */

/** Respuesta envolvente para listas simples; `success` confirma la operación. */
export interface ApiResponse<T> {
  data: T[];
  success: boolean;
}

/** Página de resultados con la posición actual y los totales del backend. */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
