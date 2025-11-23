import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { LoanStatus, PaymentStatus, ScheduleStatus, TransactionType } from '@prisma/client';
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

    return this.prisma.$transaction(async (tx: any) => {

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

      // 1. Principal payment - ledger entry
      const principalLedger = await tx.ledgerEntry.create({
        data: {
          transactionType: TransactionType.PAYMENT,
          debitAccountId: `USER_CASH`,
          creditAccountId: 'PLATFORM_FUNDS',
          amount: principalPaid,
        },
      });

      // UPDATE ACCOUNTS for principal
      await tx.account.update({
        where: { name: 'USER_CASH' },
        data: { balance: { decrement: principalPaid } },
      });

      await tx.account.update({
        where: { name: 'PLATFORM_FUNDS' },
        data: { balance: { increment: principalPaid } },
      });

      // Create audit log for principal
      await tx.auditLog.create({
        data: {
          transactionId: principalLedger.id,
          operation: 'PAYMENT',
          metadata: {
            loanId: dto.loanId,
            paymentId: payment.id,
            principalPaid,
            type: 'principal',
          },
        },
      });

      // 2. Interest payment - ledger entry
      if (interestPaid > 0) {
        const interestLedger = await tx.ledgerEntry.create({
          data: {
            transactionType: TransactionType.INTEREST,
            debitAccountId: `USER_CASH`,
            creditAccountId: 'INCOME_INTEREST',
            amount: interestPaid,
          },
        });

        // UPDATE ACCOUNTS for interest
        await tx.account.update({
          where: { name: 'USER_CASH' },
          data: { balance: { decrement: interestPaid } },
        });

        await tx.account.update({
          where: { name: 'INCOME_INTEREST' },
          data: { balance: { increment: interestPaid } },
        });

        // Create audit log for interest
        await tx.auditLog.create({
          data: {
            transactionId: interestLedger.id,
            operation: 'PAYMENT',
            metadata: {
              loanId: dto.loanId,
              paymentId: payment.id,
              interestPaid,
              type: 'interest',
            },
          },
        });
      }

      // 3. Late fee payment - ledger entry
      if (lateFeePaid > 0) {
        const feeLedger = await tx.ledgerEntry.create({
          data: {
            transactionType: TransactionType.FEE,
            debitAccountId: `USER_CASH`,
            creditAccountId: 'INCOME_LATE_FEES',
            amount: lateFeePaid,
          },
        });

        // UPDATE ACCOUNTS for late fees
        await tx.account.update({
          where: { name: 'USER_CASH' },
          data: { balance: { decrement: lateFeePaid } },
        });

        await tx.account.update({
          where: { name: 'INCOME_LATE_FEES' },
          data: { balance: { increment: lateFeePaid } },
        });

        // Create audit log for late fees
        await tx.auditLog.create({
          data: {
            transactionId: feeLedger.id,
            operation: 'PAYMENT',
            metadata: {
              loanId: dto.loanId,
              paymentId: payment.id,
              lateFeePaid,
              type: 'late_fee',
            },
          },
        });
      }
      // 4. Allocate principalPaid to upcoming installments
      let remainingPrincipal = principalPaid;

      const schedules = await tx.repaymentSchedule.findMany({
        where: { loanId: dto.loanId, status: LoanStatus.PENDING },
        orderBy: { dueDate: 'asc' },
      });

      for (const schedule of schedules) {
        if (remainingPrincipal <= 0) break;

        const installmentRemaining = Number(schedule.amount) - Number(schedule.paidAmount);

        const toPay = Math.min(remainingPrincipal, installmentRemaining);

        // Update schedule
        await tx.repaymentSchedule.update({
          where: { id: schedule.id },
          data: {
            paidAmount: {
              increment: toPay,
            },
            status:
              toPay === installmentRemaining
                ? PaymentStatus.SUCCESS
                : PaymentStatus.PENDING,
          },
        });

        // Deduct from remaining principal
        remainingPrincipal -= toPay;
      }

      
      const remainingSchedules = await tx.repaymentSchedule.count({
        where: { loanId: dto.loanId, status: LoanStatus.PENDING },
      });

      if (remainingSchedules === 0) {
        await tx.loan.update({
          where: { id: dto.loanId },
          data: {
            status: LoanStatus.CLOSED,
            paidDate: new Date(), // remove if you don't track closedAt
          },
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
        schedules: {
          include: {
            payments: true, // <- include payments for each schedule
          },
        },      
      },
    });

    if (!loan) throw new BadRequestException('Loan not found');

    const today = new Date();

    // 1. OUTSTANDING PRINCIPAL (sum of schedule principal - paid)
    const principalPaid = loan.payments.reduce(
      (sum, p) => sum + Number(p.principalPaid),
      0
    );

    const totalPrincipalScheduled = loan.schedules.reduce(
      (sum, s) => sum + Number(s.principalAmount),
      0
    );

    const outstandingPrincipal = +(totalPrincipalScheduled - principalPaid).toFixed(2);

    // 2. LAST PAYMENT DATE
    const lastPaymentDate = loan.payments.length
      ? loan.payments.reduce((latest, p) =>
          p.paymentDate > latest ? p.paymentDate : latest
        , loan.payments[0].paymentDate)
      : loan.createdAt;

    const start = new Date(lastPaymentDate.getFullYear(), lastPaymentDate.getMonth(), lastPaymentDate.getDate());
    const end = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    const daysSinceLastPayment = Math.max(0, Math.floor((end.getTime() - start.getTime()) / 86400000));

    // 3. INTEREST ON OUTSTANDING PRINCIPAL
    const dailyRate = Number(loan.interestRate) / 100 / 365;
    const interestAccrued = +(outstandingPrincipal * dailyRate * daysSinceLastPayment).toFixed(2);

    // 4. NEXT SCHEDULE
    const nextSchedule = loan.schedules
      .filter(s => s.status === 'PENDING')
      .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())[0];

    let nextPrincipal = 0;
    let nextInterest = 0;
    let lateFee = 0;
    let daysOverdue = 0;

    if (nextSchedule) {
      // Principal remaining for next installment
      const principalPaidForSchedule = nextSchedule.payments
        .reduce((sum, p) => sum + Number(p.principalPaid), 0);

      nextPrincipal = Math.max(0, Number(nextSchedule.principalAmount) - principalPaidForSchedule);



      // Interest for this installment
      nextInterest = Number(nextSchedule.interestAmount);

      // Late fee
      const due = new Date(nextSchedule.dueDate.getFullYear(), nextSchedule.dueDate.getMonth(), nextSchedule.dueDate.getDate());
      if (end > due) {
        daysOverdue = Math.floor((end.getTime() - due.getTime()) / 86400000);
        if (daysOverdue - 3 > 0) lateFee = 25;
      }
    }

    const nextInstallmentDue = {
      principal: +nextPrincipal.toFixed(2),
      interest: +nextInterest.toFixed(2),
      lateFee,
      daysOverdue,
      totalDue: +(nextPrincipal + nextInterest + lateFee).toFixed(2),
    };

    const totalDue = +(outstandingPrincipal + interestAccrued + lateFee).toFixed(2);

    return {
      outstandingPrincipal,
      interestAccrued,
      lateFee,
      daysOverdue,
      totalDue,
      nextInstallmentDue,
    };
  }
}