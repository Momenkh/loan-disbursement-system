export class AuditLogEntity {
  id: string;
  transactionId: string;
  operation: string;
  userId?: string;
  metadata?: any;
  createdAt: Date;
}