export class RollbackRecordEntity {
  id: string;
  transactionId: string;
  originalOperation: 'disbursement' | 'repayment';
  rollbackReason: string;
  compensatingActions: any[];
  rolledBackBy: string;
  createdAt: Date;
}