import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';
import { CreateDisbursementDto } from './dto/create-disbursement.dto';
import { LedgerService } from '../ledger/ledger.service';
import type { RepaymentSchedule } from '@prisma/client';

@Injectable()
export class DisbursementsService {
  private prisma = new PrismaClient();
  private logger = new Logger(DisbursementsService.name);

  constructor(private ledgerService: LedgerService) {}

  async createDisbursement(dto: CreateDisbursementDto) {
    const transactionId = `txn_${Date.now()}`;

    return this.prisma.$transaction(async (prisma) => {
      // Load loan and check status
      const loan = await prisma.loan.findUnique({ where: { id: dto.loanId } });
      if (!loan) throw new NotFoundException('Loan not found');
      if (loan.status !== 'approved') {
        throw new BadRequestException('Only approved loans can be disbursed');
      }

      // Check idempotency: has this loan already been disbursed?
      const existing = await prisma.disbursement.findUnique({ where: { loanId: dto.loanId } });
      if (existing) throw new BadRequestException('Loan already disbursed');

      // Create disbursement
      const disbursement = await prisma.disbursement.create({
        data: {
          loanId: dto.loanId,
          amount: dto.amount,
          disbursementDate: dto.disbursementDate,
          status: 'completed',
        },
      });

      // Generate repayment schedule
      await this.generateRepaymentSchedule(loan, prisma);

      // Ledger entries: debit platform, credit client
      await this.ledgerService.createLedgerEntry({
        transactionId,
        debitAccount: 'PLATFORM_FUNDS',
        creditAccount: `USER_BALANCE_${loan.clientId}`,
        amount: dto.amount,
      });

      // Update loan status to disbursed
      await prisma.loan.update({ where: { id: dto.loanId }, data: { status: 'disbursed' } });

      this.logger.log({ message: 'Disbursement completed', transactionId, loanId: dto.loanId });
      return disbursement;
    }, { isolationLevel: 'RepeatableRead' });
  }

  private async generateRepaymentSchedule(loan, prisma: PrismaClient | Prisma.TransactionClient) {
    const monthlyPayment = Number(
      (
        (Number(loan.amount) * (Number(loan.interestRate) / 100 / 12)) /
        (1 - Math.pow(1 + Number(loan.interestRate) / 100 / 12, -loan.tenor))
      ).toFixed(2)
    );

    const firstPaymentDate = new Date();
    firstPaymentDate.setMonth(firstPaymentDate.getMonth() + 1);
    firstPaymentDate.setDate(1); // first of next month
    const schedulePromises: Promise<RepaymentSchedule>[] = [];
    for (let i = 1; i <= loan.tenor; i++) {
      const dueDate = new Date();
      dueDate.setMonth(dueDate.getMonth() + i); // first payment next month
      schedulePromises.push(
        prisma.repaymentSchedule.create({
          data: {
            loanId: loan.id,
            installmentNumber: i,
            dueDate,
            principalAmount: Number((Number(loan.amount) / loan.tenor).toFixed(2)),
            interestAmount: Number((monthlyPayment - Number(loan.amount) / loan.tenor).toFixed(2)),
            status: 'pending',
          },
        }),
      );
    }
    await Promise.all(schedulePromises);
  }
}
