export class RepaymentEntity {
  id: string;
  loanId: string;
  clientId: string;
  amount: number;
  principalPaid: number;
  interestPaid: number;
  lateFeePaid: number;
  daysLate: number;
  status: 'pending' | 'completed' | 'rolled_back';
  paymentDate: Date;
  createdAt: Date;
}