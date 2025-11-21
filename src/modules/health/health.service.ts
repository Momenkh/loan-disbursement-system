import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { LedgerService } from '../ledger/ledger.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class HealthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledgerService: LedgerService,
    private readonly auditService: AuditService,
  ) {}

  async checkAll() {
    const result: Record<string, any> = { timestamp: new Date().toISOString() };

    try {
      await this.prisma.$queryRaw`SELECT 1`; // lightweight query
      result.database = 'connected';
    } catch (err) { result.database = { status: 'error', message: err.message };}

    try {
      const count = await this.prisma.ledgerEntry.count();
      result.ledgerService = { status: 'ok', totalEntries: count };
    } catch (err) { result.ledgerService = { status: 'error', message: err.message };}

    try {
      const last = await this.prisma.auditLog.findFirst({
        orderBy: { createdAt: 'desc' },
      });
      result.auditService = { status: 'ok', lastAuditId: last?.id || null };
    } catch (err) { result.auditService = { status: 'error', message: err.message };}

    try {
      const last = await this.prisma.disbursement.findFirst({
        orderBy: { createdAt: 'desc' },
      });
      result.disbursementService = { status: 'ok', lastDisbursementId: last?.id || null };
    } catch (err) { result.disbursementService = { status: 'error', message: err.message };}

    try {
      const last = await this.prisma.client.findFirst({
        orderBy: { createdAt: 'desc' },
      });
      result.clientService = { status: 'ok', lastClientId: last?.id || null };
    } catch (err) { result.clientService = { status: 'error', message: err.message };}

    try {
      const last = await this.prisma.loan.findFirst({
        orderBy: { createdAt: 'desc' },
      });
      result.loanService = { status: 'ok', lastLoanId: last?.id || null };
    } catch (err) { result.loanService = { status: 'error', message: err.message };}

    try {
      const last = await this.prisma.payment.findFirst({
        orderBy: { createdAt: 'desc' },
      });
      result.paymentService = { status: 'ok', lastPaymentId: last?.id || null };
    } catch (err) { result.paymentService = { status: 'error', message: err.message };}

    try {
      const last = await this.prisma.rollbackRecord.findFirst({
        orderBy: { createdAt: 'desc' },
      });
      result.rollbackRecordService = { status: 'ok', lastRollbackRecordId: last?.id || null };
    } catch (err) { result.rollbackRecordService = { status: 'error', message: err.message };}

    try {
      const last = await this.prisma.repaymentSchedule.findFirst({
        orderBy: { createdAt: 'desc' },
      });
      result.repaymentScheduleService = { status: 'ok', lastRepaymentScheduleId: last?.id || null };
    } catch (err) { result.repaymentScheduleService = { status: 'error', message: err.message };}

    result.status =
      result.database === 'connected' &&
      result.ledgerService?.status === 'ok' &&
      result.auditService?.status === 'ok'
        ? 'ok'
        : 'degraded';

    return result;
  }
}
