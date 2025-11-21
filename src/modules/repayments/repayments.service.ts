import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { LoanStatus, PaymentStatus, TransactionType } from '@prisma/client';
import { CreateRepaymentDto } from './dto/create-repayment.dto';
import { LedgerService } from '../ledger/ledger.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class RepaymentsService {
  private logger = new Logger(RepaymentsService.name);

  constructor(private readonly prisma: PrismaService, private readonly ledgerService: LedgerService) {}

  async createRepayment(dto: CreateRepaymentDto) {
    const transactionId = `txn_${Date.now()}`;

    this.logger.log({
      message: 'Starting repayment processing',
      transactionId,
      loanId: dto.loanId,
      clientId: dto.clientId,
      amount: dto.amount,
    });

    return this.prisma.$transaction(async (tx: PrismaService) => {

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

      // Late fee
      const lastSchedule = await tx.repaymentSchedule.findFirst({
        where: { loanId: dto.loanId, status: LoanStatus.PENDING },
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

      // Prioritization: interest -> late fee -> principal
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
          status: PaymentStatus.SUCCESS,
          paymentDate: dto.paymentDate,
        },
      });

      // Ledger entries
      // 1. Principal goes to PLATFORM_FUNDS
      await this.ledgerService.createLedgerEntry({
        transactionType: TransactionType.PAYMENT,
        debitAccountId: `USER_${dto.clientId}`,
        creditAccountId: 'PLATFORM_FUNDS',
        amount: principalPaid,
      });

      // 2. Interest to INCOME_INTEREST
      if (interestPaid > 0) {
        await this.ledgerService.createLedgerEntry({
          transactionType: TransactionType.PAYMENT,
          debitAccountId: `USER_${dto.clientId}`,
          creditAccountId: 'INCOME_INTEREST',
          amount: interestPaid,
        });
      }

      // 3. Late fee to INCOME_LATE_FEES
      if (lateFeePaid > 0) {
        await this.ledgerService.createLedgerEntry({
          transactionType: TransactionType.PAYMENT,
          debitAccountId: `USER_${dto.clientId}`,
          creditAccountId: 'INCOME_LATE_FEES',
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

  async getPaymentHistory(loanId: string) {
    return this.prisma.payment.findMany({
      where: { loanId },
      orderBy: { paymentDate: 'desc' },
    });
  }

  async getRepaymentSchedule(loanId: string) {
    return this.prisma.repaymentSchedule.findMany({
      where: { loanId },
      orderBy: { dueDate: 'asc' },
    });
  }

  async calculateCurrentDues(loanId: string) {
    const loan = await this.prisma.loan.findUnique({
      where: { id: loanId },
      include: {
        payments: true,
        schedules: true, 
      },
    });

    if (!loan) throw new BadRequestException('Loan not found');

    const principalPaid = loan.payments.reduce((sum, p) => sum + Number(p.principalPaid), 0);
    const outstandingPrincipal = Number(loan.amount) - principalPaid;

    const lastPaymentDate =
      loan.payments
        .map(p => p.paymentDate)
        .sort((a, b) => b.getTime() - a.getTime())[0] || loan.createdAt;

    const today = new Date();
    const daysSinceLastPayment = Math.floor(
      (today.getTime() - lastPaymentDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    const dailyRate = Number(loan.interestRate) / 100 / 365;
    const interestAccrued = +(outstandingPrincipal * dailyRate * daysSinceLastPayment).toFixed(2);

    const nextSchedule = loan.schedules
      .filter(s => s.status === 'PENDING')
      .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())[0];

    let lateFee = 0;
    let daysLate = 0;
    if (nextSchedule && today > nextSchedule.dueDate) {
      daysLate = Math.max(0, Math.floor((today.getTime() - nextSchedule.dueDate.getTime()) / (1000 * 60 * 60 * 24)) - 3);
      if (daysLate > 0) lateFee = 25;
    }

    return {
      outstandingPrincipal,
      interestAccrued,
      lateFee,
      daysLate,
    }
  }
}