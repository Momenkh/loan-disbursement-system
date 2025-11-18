export class LedgerEntryEntity {
  id: string;
  transactionId: string;
  debitAccountName: string;
  creditAccountName: string;
  amount: number;
  createdAt: Date;
}