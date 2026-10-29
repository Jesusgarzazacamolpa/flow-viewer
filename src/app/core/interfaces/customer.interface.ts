/**
 * Cliente del catálogo comercial, usado para poblar el selector del formulario
 * de inicio de flujo.
 */
export interface Customer {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  identificationNumber?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
