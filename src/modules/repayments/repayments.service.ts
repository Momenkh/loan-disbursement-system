import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';
import { CreateRepaymentDto } from './dto/create-repayment.dto';
import { LedgerService } from '../ledger/ledger.service';

@Injectable()
export class RepaymentsService {
  private prisma = new PrismaClient();
  private logger = new Logger(RepaymentsService.name);

  constructor(private ledgerService: LedgerService) {}

  async createRepayment(dto: CreateRepaymentDto) {
    const transactionId = `txn_${Date.now()}`;

    this.logger.log({
      message: 'Starting repayment processing',
      transactionId,
      loanId: dto.loanId,
      clientId: dto.clientId,
      amount: dto.amount,
    });

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Get loan details and last payment
      const loan = await tx.loan.findUnique({
        where: { id: dto.loanId },
        include: { payments: true },
      });

      if (!loan) throw new BadRequestException('Loan not found');

      const lastPaymentDate = loan.payments
        .map(p => p.paymentDate)
        .sort((a, b) => b.getTime() - a.getTime())[0] || loan.createdAt;

      const daysSinceLastPayment = Math.floor(
        (dto.paymentDate.getTime() - lastPaymentDate.getTime()) / (1000 * 60 * 60 * 24),
      );

      // Daily interest
      const dailyRate = Number(loan.interestRate) / 100 / 365;
      const principalOutstanding = Number(loan.amount) - loan.payments.reduce(
        (sum, p) => sum + Number(p.principalPaid),
        0,
      );

      let interestAccrued = +(principalOutstanding * dailyRate * daysSinceLastPayment).toFixed(2);

      // Late fee (after 3-day grace)
      const lastSchedule = await tx.repaymentSchedule.findFirst({
        where: { loanId: dto.loanId, status: 'pending' },
        orderBy: { dueDate: 'asc' },
      });

      let lateFee = 0;
      let daysLate = 0;
      if (lastSchedule && dto.paymentDate > lastSchedule.dueDate) {
        daysLate = Math.max(
          0,
          Math.floor((dto.paymentDate.getTime() - lastSchedule.dueDate.getTime()) / (1000 * 60 * 60 * 24)) - 3,
        );
        if (daysLate > 0) lateFee = 25;
      }

      // Allocate payment
      let remaining = dto.amount;
      const interestPaid = Math.min(remaining, interestAccrued);
      remaining -= interestPaid;

      const lateFeePaid = Math.min(remaining, lateFee);
      remaining -= lateFeePaid;

      const principalPaid = remaining;

      // Create Payment record
      const payment = await tx.payment.create({
        data: {
          loanId: dto.loanId,
          amount: dto.amount,
          principalPaid: +principalPaid.toFixed(2),
          interestPaid: +interestPaid.toFixed(2),
          lateFeePaid: +lateFeePaid.toFixed(2),
          daysLate,
          status: 'completed',
          paymentDate: dto.paymentDate,
        },
      });

      // Ledger entries
      // 1. Principal goes to PLATFORM_FUNDS
      await this.ledgerService.createLedgerEntry({
        transactionId,
        debitAccount: `USER_BALANCE_${dto.clientId}`,
        creditAccount: 'PLATFORM_FUNDS',
        amount: principalPaid,
      });

      // 2. Interest to INCOME_INTEREST
      if (interestPaid > 0) {
        await this.ledgerService.createLedgerEntry({
          transactionId,
          debitAccount: `USER_BALANCE_${dto.clientId}`,
          creditAccount: 'INCOME_INTEREST',
          amount: interestPaid,
        });
      }

      // 3. Late fee to INCOME_LATE_FEES
      if (lateFeePaid > 0) {
        await this.ledgerService.createLedgerEntry({
          transactionId,
          debitAccount: `USER_BALANCE_${dto.clientId}`,
          creditAccount: 'INCOME_LATE_FEES',
          amount: lateFeePaid,
        });
      }

      this.logger.log({
        message: 'Repayment processed successfully',
        transactionId,
        paymentId: payment.id,
        breakdown: { principalPaid, interestPaid, lateFeePaid, daysLate },
      });

      return payment;
    }, { isolationLevel: 'RepeatableRead' });
  }
}