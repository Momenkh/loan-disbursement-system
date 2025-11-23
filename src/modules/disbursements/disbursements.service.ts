import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { LoanStatus, DisbursementStatus, ScheduleStatus, TransactionType } from '@prisma/client';
import { CreateDisbursementDto } from './dto/create-disbursement.dto';
import { LedgerService } from '../ledger/ledger.service';
import type { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class DisbursementsService {
  private logger = new Logger(DisbursementsService.name);

  constructor(private readonly prisma: PrismaService, private readonly ledgerService: LedgerService) {}

async createDisbursement(dto: CreateDisbursementDto, username: string) {
  const transactionId = `txn_${Date.now()}`;

  const user = await this.prisma.user.findUnique({
    where: { username },
  });

  return this.prisma.$transaction(async (prisma) => {
    // Load loan and ALL disbursements
    const loan = await prisma.loan.findUnique({ 
      where: { id: dto.loanId },
      include: { 
        disbursements: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });
    
    if (!loan) throw new NotFoundException('Loan not found');
    if (loan.status !== LoanStatus.APPROVED) {
      throw new BadRequestException('Only approved loans can be disbursed');
    }

    // Find disbursement statuses
    const completedDisbursement = loan.disbursements.find(d => d.status === DisbursementStatus.COMPLETED);
    const pendingDisbursement = loan.disbursements.find(d => d.status === DisbursementStatus.PENDING);

    if (completedDisbursement) {
      throw new BadRequestException('Loan already has a completed disbursement');
    }

    let disbursement;

    if (pendingDisbursement) {
      // Update PENDING to COMPLETED
      disbursement = await prisma.disbursement.update({
        where: { id: pendingDisbursement.id },
        data: {
          amount: dto.amount,
          disbursementDate: dto.disbursementDate || new Date(),
          status: DisbursementStatus.COMPLETED,
        },
      });
    } else {
      // Only ROLLED_BACK exist (or none), create new COMPLETED
      disbursement = await prisma.disbursement.create({
        data: {
          loanId: dto.loanId,
          amount: dto.amount,
          disbursementDate: dto.disbursementDate || new Date(),
          status: DisbursementStatus.COMPLETED,
        },
      });
    }

    // Generate repayment schedule
    await this.generateRepaymentSchedule(loan, prisma);

    // Create ledger entry
    const ledgerEntry = await prisma.ledgerEntry.create({
      data: {
        transactionType: TransactionType.DISBURSEMENT,
        amount: dto.amount,
        loanId: loan.id,
        debitAccountId: 'PLATFORM_FUNDS',
        creditAccountId: `USER_CASH`,
      },
    });

    // UPDATE ACCOUNTS - Money leaves platform, goes to user
    await prisma.account.update({
      where: { name: 'PLATFORM_FUNDS' },
      data: { balance: { decrement: dto.amount } },
    });

    await prisma.account.update({
      where: { name: 'USER_CASH' },
      data: { balance: { increment: dto.amount } },
    });

    // Create audit log
    if (user?.id) {
      await prisma.auditLog.create({
        data: {
          transactionId: ledgerEntry.id,
          operation: 'DISBURSEMENT',
          userId: user.id,
          metadata: {
            loanId: loan.id,
            amount: dto.amount,
            disbursementDate: dto.disbursementDate,
          },
        },
      });
    }

    // Update loan status to ACTIVE
    await prisma.loan.update({ 
      where: { id: dto.loanId }, 
      data: { status: LoanStatus.ACTIVE } 
    });

    this.logger.log({ 
      message: 'Disbursement completed', 
      transactionId, 
      loanId: dto.loanId 
    });
    
    return disbursement;
  }, { isolationLevel: 'RepeatableRead' });
}

private async generateRepaymentSchedule(
  loan: any, 
  prisma: Prisma.TransactionClient
) {
  // Check if schedules already exist
  const existingSchedules = await prisma.repaymentSchedule.count({
    where: { loanId: loan.id },
  });

  if (existingSchedules > 0) {
    this.logger.warn(`Repayment schedules already exist for loan ${loan.id}`);
    return;
  }

  const principal = Number(loan.amount);
  const monthlyRate = Number(loan.interestRate) / 100 / 12;
  const numberOfPayments = loan.numberOfInstallments;

  // Calculate monthly payment using amortization formula
  const monthlyPayment =
    (principal * monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments)) /
    (Math.pow(1 + monthlyRate, numberOfPayments) - 1);

  let remainingPrincipal = principal;
  const schedules: Prisma.RepaymentScheduleCreateManyInput[] = [];

  for (let i = 1; i <= numberOfPayments; i++) {
    const dueDate = new Date();
    dueDate.setMonth(dueDate.getMonth() + i);
    dueDate.setDate(1); // First of the month

    // Calculate interest on remaining principal
    const interestAmount = remainingPrincipal * monthlyRate;
    const principalAmount = monthlyPayment - interestAmount;
    remainingPrincipal -= principalAmount;

    // Handle last payment rounding
    const isLastPayment = i === numberOfPayments;
    const finalPrincipal = isLastPayment
      ? principalAmount + remainingPrincipal
      : principalAmount;

    schedules.push({
      loanId: loan.id,
      installmentNumber: i,
      dueDate,
      principalAmount: Number(finalPrincipal.toFixed(2)),
      interestAmount: Number(interestAmount.toFixed(2)),
      status: ScheduleStatus.PENDING,
    });
  }

  // Batch create all schedules
  await prisma.repaymentSchedule.createMany({
    data: schedules,
  });

  this.logger.log(`Created ${schedules.length} repayment schedules for loan ${loan.id}`);
}

  async getAllDisbursements() {
    return this.prisma.disbursement.findMany();
  }

  async getDisbursementById(id: string) {
    const disbursement = await this.prisma.disbursement.findUnique({ where: { id } });
    if (!disbursement) throw new NotFoundException('Disbursement not found');
    return disbursement;
  }

  async rollbackDisbursement(id: string, username: string) {
    const disbursement = await this.prisma.disbursement.findUnique({ where: { id } });

    if (!disbursement) throw new NotFoundException('Disbursement not found');

    const user = await this.prisma.user.findUnique({
      where: { username },
    });

    return this.prisma.$transaction(async (prisma) => {
      const transactionId = `rollback_${Date.now()}`;
      const loan = await prisma.loan.findUnique({ where: { id: disbursement.loanId } });
      if (!loan) throw new NotFoundException('Associated loan not found');
      
      // Create rollback ledger entry
      const ledgerEntry = await prisma.ledgerEntry.create({
        data: {
          transactionType: TransactionType.ROLLBACK,
          debitAccountId: `USER_CASH`,
          creditAccountId: 'PLATFORM_FUNDS',
          amount: Number(disbursement.amount),
        },
      });

      // UPDATE ACCOUNTS - Money leaves user, returns to platform
      await prisma.account.update({
        where: { name: 'USER_CASH' },
        data: { balance: { decrement: disbursement.amount } },
      });

      await prisma.account.update({
        where: { name: 'PLATFORM_FUNDS' },
        data: { balance: { increment: disbursement.amount } },
      });

      // Create audit log directly in transaction
      console.log('User ID for audit log:', user?.id);
      if (user?.id) {
        await prisma.auditLog.create({
          data: {
            transactionId: ledgerEntry.id,
            operation: 'ROLLBACK',
            userId: user.id,
            metadata: {
              loanId: loan.id,
              disbursementId: disbursement.id,
              amount: Number(disbursement.amount),
            },
          },
        });
      }

      // Delete repayment schedules
      await prisma.repaymentSchedule.deleteMany({
        where: { loanId: loan.id },
      });

      // Update loan status back to approved
      await prisma.loan.update({ 
        where: { id: loan.id }, 
        data: { status: LoanStatus.APPROVED } 
      });

      // Update disbursement status to rolled back
      await prisma.disbursement.update({ 
        where: { id: disbursement.id }, 
        data: { status: DisbursementStatus.ROLLED_BACK } 
      });

      this.logger.log({ 
        message: 'Disbursement rolled back', 
        transactionId, 
        disbursementId: disbursement.id 
      });
      
      return { message: 'Disbursement rolled back successfully' };
    }); 
  }
}