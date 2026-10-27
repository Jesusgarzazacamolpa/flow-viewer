export interface FlowCatalogItem {
  id: string;
  label: string;
  templateName: string;
}

export const FLOW_CATALOG: readonly FlowCatalogItem[] = [
  {
    id: 'compra-vehiculo',
    label: 'Compra de vehículo',
    templateName: 'Compra de vehículo',
  },
];

export const DEFAULT_FLOW_ID = FLOW_CATALOG[0].id;
export const DEFAULT_TEMPLATE_NAME = FLOW_CATALOG[0].templateName;
