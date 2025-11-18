export class RollbackRecordEntity {
  id: string;
  transactionId: string;
  originalOperation: 'disbursement' | 'repayment';
  rollbackReason: string;
  compensatingActions: any[]; // ledger / reverse entries
  rolledBackBy: string;
  createdAt: Date;
}