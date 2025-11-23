export class RepaymentEntity {
  id: string;
  loanId: string;
  clientId: string;
  amount: number;
  principalPaid: number;
  interestPaid: number;
  lateFeePaid: number;
  daysLate: number;
  status: 'PENDING' | 'COMPLETED' | 'ROLLED_BACK';
  paidDate: Date;
  createdAt: Date;
  payments: RepaymentEntity[]; // optional, can default to []
}