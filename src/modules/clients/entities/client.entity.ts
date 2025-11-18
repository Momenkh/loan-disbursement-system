export class ClientEntity {
  id: string;
  name: string;
  email?: string;
  phoneNumber?: string;
  kycStatus: 'pending' | 'verified' | 'rejected';
  riskScore?: number;
  createdAt: Date;
  updatedAt: Date;
}