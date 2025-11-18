export class DisbursementEntity {
  id: string;
  loanId: string;
  clientId: string;
  amount: number;
  disbursementDate: Date;
  status: 'pending' | 'completed' | 'failed' | 'rolled_back';
  createdAt: Date;
}