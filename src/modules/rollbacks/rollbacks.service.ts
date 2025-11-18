import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';
import { RollbackTransactionDto } from './dto/rollback-transaction.dto';
import { LedgerService } from '../ledger/ledger.service';

@Injectable()
export class RollbacksService {
  private prisma = new PrismaClient();
  private logger = new Logger(RollbacksService.name);

  constructor(private ledgerService: LedgerService) {}

  async rollbackTransaction(dto: RollbackTransactionDto) {
    const transactionId = dto.transactionId;
    this.logger.log({ message: 'Starting rollback', transactionId });

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Check if rollback already exists
      const existingRollback = await tx.rollbackRecord.findUnique({
        where: { transactionId },
      });
      if (existingRollback) {
        throw new BadRequestException('Transaction already rolled back');
      }

      // Determine original operation
      let originalOperation: 'disbursement' | 'repayment';
      const disbursement = await tx.disbursement.findUnique({ where: { id: transactionId } });
      const payment = !disbursement ? await tx.payment.findUnique({ where: { id: transactionId } }) : null;

      if (disbursement) originalOperation = 'disbursement';
      else if (payment) originalOperation = 'repayment';
      else throw new BadRequestException('Transaction not found');

      // Create compensating actions
      let compensatingActions: any[] = [];

      if (disbursement && originalOperation === 'disbursement') {
        // Reverse ledger: credit platform, debit client
        await this.ledgerService.createLedgerEntry({
          transactionId: `rollback_${transactionId}`,
          debitAccount: `USER_BALANCE_${disbursement.loanId}`,
          creditAccount: 'PLATFORM_FUNDS',
          amount: Number(disbursement.amount),
        });
        compensatingActions.push({ type: 'ledger_reverse', amount: Number(disbursement.amount) });

        // Mark disbursement rolled_back
        await tx.disbursement.update({
          where: { id: transactionId },
          data: { status: 'rolled_back', rolledBackAt: new Date() },
        });
      } else if (payment && originalOperation === 'repayment') {
        // Reverse ledger: debit PLATFORM_FUNDS / INCOME, credit client
        await this.ledgerService.createLedgerEntry({
          transactionId: `rollback_${transactionId}`,
          debitAccount: 'PLATFORM_FUNDS',
          creditAccount: `USER_BALANCE_${payment.loanId}`,
          amount: Number(payment.principalPaid),
        });
        if (Number(payment.interestPaid) > 0) {
          await this.ledgerService.createLedgerEntry({
            transactionId: `rollback_${transactionId}`,
            debitAccount: 'INCOME_INTEREST',
            creditAccount: `USER_BALANCE_${payment.loanId}`,
            amount: Number(payment.interestPaid),
          });
        }
        if (Number(payment.lateFeePaid) > 0) {
          await this.ledgerService.createLedgerEntry({
            transactionId: `rollback_${transactionId}`,
            debitAccount: 'INCOME_LATE_FEES',
            creditAccount: `USER_BALANCE_${payment.loanId}`,
            amount: Number(payment.lateFeePaid),
          });
        }
        compensatingActions.push({ type: 'ledger_reverse', paymentId: transactionId });

        // Mark payment rolled_back
        await tx.payment.update({
          where: { id: transactionId },
          data: { status: 'rolled_back', rolledBackAt: new Date() },
        });
      }

      // Insert rollback record
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
