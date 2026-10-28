export interface Agent {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  licenseNumber: string;
  isActive: boolean;
  specialization: string;
}
