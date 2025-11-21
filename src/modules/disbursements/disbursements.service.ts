import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { LoanStatus, DisbursementStatus, ScheduleStatus, TransactionType } from '@prisma/client';
import { CreateDisbursementDto } from './dto/create-disbursement.dto';
import { LedgerService } from '../ledger/ledger.service';
import type { Prisma, RepaymentSchedule } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class DisbursementsService {
  private logger = new Logger(DisbursementsService.name);

  constructor(private readonly prisma: PrismaService, private readonly ledgerService: LedgerService) {}

  async createDisbursement(dto: CreateDisbursementDto) {
    const transactionId = `txn_${Date.now()}`;

    return this.prisma.$transaction(async (prisma) => {
      // Load loan and check status
      const loan = await prisma.loan.findUnique({ where: { id: dto.loanId } });
      if (!loan) throw new NotFoundException('Loan not found');
      if (loan.status !== LoanStatus.APPROVED) {
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
          status: DisbursementStatus.COMPLETED,
        },
      });

      // Generate repayment schedule
      await this.generateRepaymentSchedule(loan, prisma);

      // Ledger entries: debit platform, credit client
      await this.ledgerService.createLedgerEntry({
        transactionType: TransactionType.DISBURSEMENT,
        debitAccountId: 'PLATFORM_FUNDS',
        creditAccountId: `USER_${loan.clientId}`,
        amount: dto.amount,
      });

      // Update loan status to disbursed
      await prisma.loan.update({ where: { id: dto.loanId }, data: { status: LoanStatus.ACTIVE } });

      this.logger.log({ message: 'Disbursement completed', transactionId, loanId: dto.loanId });
      return disbursement;
    }, { isolationLevel: 'RepeatableRead' });
  }

  private async generateRepaymentSchedule(loan, prisma: PrismaService | Prisma.TransactionClient) {
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
            status: ScheduleStatus.PENDING,
          },
        }),
      );
    }
    await Promise.all(schedulePromises);
  }

  async getAllDisbursements() {
    return this.prisma.disbursement.findMany();
  }

  async getDisbursementById(id: string) {
    const disbursement = await this.prisma.disbursement.findUnique({ where: { id } });
    if (!disbursement) throw new NotFoundException('Disbursement not found');
    return disbursement;
  }

  async rollbackDisbursement(id: string) {
    const disbursement = await this.prisma.disbursement.findUnique({ where: { id } });
    if (!disbursement) throw new NotFoundException('Disbursement not found');
    return this.prisma.$transaction(async (prisma) => {
      // Reverse ledger entries
      const transactionId = `rollback_${Date.now()}`;
      const loan = await prisma.loan.findUnique({ where: { id: disbursement.loanId } });
      if (!loan) throw new NotFoundException('Associated loan not found');
      await this.ledgerService.createLedgerEntry({
        transactionType: TransactionType.ROLLBACK,
        debitAccountId: `USER_${loan.clientId}`,
        creditAccountId: 'PLATFORM_FUNDS',
        amount: Number(disbursement.amount),
      });

      // Update loan status back to approved
      await prisma.loan.update({ where: { id: loan.id }, data: { status: LoanStatus.APPROVED } });

      // Update disbursement status to rolled back
      await prisma.disbursement.update({ where: { id: disbursement.id }, data: { status: DisbursementStatus.ROLLED_BACK } });

      this.logger.log({ message: 'Disbursement rolled back', transactionId, disbursementId: disbursement.id });
      return { message: 'Disbursement rolled back successfully' };
    }); 
  }
}