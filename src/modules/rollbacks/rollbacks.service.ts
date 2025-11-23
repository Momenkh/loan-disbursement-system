import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { DisbursementStatus, PaymentStatus, TransactionType } from '@prisma/client';
import { RollbackTransactionDto } from './dto/rollback-transaction.dto';
import { LedgerService } from '../ledger/ledger.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class RollbacksService {

  private logger = new Logger(RollbacksService.name);

  constructor(private readonly prisma: PrismaService, private readonly ledgerService: LedgerService) {}

  async rollbackTransaction(dto: RollbackTransactionDto) {
    const transactionId = dto.transactionId;
    this.logger.log({ message: 'Starting rollback', transactionId });

    return this.prisma.$transaction(async (tx: PrismaService) => {

      const existingRollback = await tx.rollbackRecord.findUnique({
        where: { transactionId },
      });
      if (existingRollback) {
        throw new BadRequestException('Transaction already rolled back');
      }

      let originalOperation: 'disbursement' | 'repayment';
      const disbursement = await tx.disbursement.findUnique({ where: { id: transactionId } });
      const payment = !disbursement ? await tx.payment.findUnique({ where: { id: transactionId } }) : null;

      if (disbursement) originalOperation = 'disbursement';
      else if (payment) originalOperation = 'repayment';
      else throw new BadRequestException('Transaction not found');

      let compensatingActions: any[] = [];

      if (disbursement && originalOperation === 'disbursement') {

        await tx.disbursement.update({
          where: { id: transactionId },
          data: { status: DisbursementStatus.ROLLED_BACK, rolledBackAt: new Date() },
        });
      } else if (payment && originalOperation === 'repayment') {

        compensatingActions.push({ type: 'ledger_reverse', paymentId: transactionId });

        await tx.payment.update({
          where: { id: transactionId },
          data: { status: PaymentStatus.ROLLED_BACK, rolledBackAt: new Date() },
        });
      }

      const rollbackRecord = await tx.rollbackRecord.create({
        data: {
          transactionId,
          originalOperation,
          rollbackReason: dto.reason,
          compensatingActions,
          rolledBackBy: dto.rolledBackBy,
        },
      });

      this.logger.log({ message: 'Rollback completed', transactionId });
      return rollbackRecord;
    }, { isolationLevel: 'RepeatableRead' });
  }
}
