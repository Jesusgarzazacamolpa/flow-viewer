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
