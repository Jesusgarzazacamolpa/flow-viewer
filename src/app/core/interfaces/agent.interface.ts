export interface Agent {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  licenseNumber: string;
  active: boolean;
  specialization: string;
}
