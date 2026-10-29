/**
 * Catálogo de flujos disponibles en el dashboard: relaciona el id interno, la
 * etiqueta de la UI y el nombre de la plantilla sembrada en control-center.
 */
export interface FlowCatalogItem {
  id: string;
  label: string;
  templateName: string;
}

/**
 * Flujos ofrecidos en el selector; `templateName` debe coincidir con el nombre
 * de la plantilla creada por las migraciones del control-center.
 */
export const FLOW_CATALOG: readonly FlowCatalogItem[] = [
  {
    id: 'compra-vehiculo',
    label: 'Compra de vehículo',
    templateName: 'Compra de vehiculo',
  },
  {
    id: 'compra-financiamiento',
    label: 'Compra con financiamiento',
    templateName: 'Compra con financiamiento',
  },
  {
    id: 'apartado-vehiculo',
    label: 'Apartado de vehículo',
    templateName: 'Apartado de vehiculo',
  },
];

/** Flujo preseleccionado en el formulario: el primero del catálogo. */
export const DEFAULT_FLOW_ID = FLOW_CATALOG[0].id;
