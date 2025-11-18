export class LoanEntity {
  id: string;
  clientId: string;
  type: string;
  amount: number;
  interestRate: number;
  tenor: number;
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'disbursed' | 'rolled_back' | 'closed';
  createdAt: Date;
  updatedAt: Date;
}