export class LedgerEntryEntity {
  id: string;
  transactionType: string;
  debitAccountName: string;
  creditAccountName: string;
  amount: number;
  createdAt: Date;
}