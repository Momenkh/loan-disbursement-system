import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DisbursementStatus, LoanStatus, ScheduleStatus } from '@prisma/client';
import { CreateLoanDto } from './dto/create-loan.dto';
import { UpdateLoanDto } from './dto/update-loan.dto';
import { ApproveLoanDto } from './dto/approve-loan.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class LoansService {
  constructor(private prisma: PrismaService) {}

  /** Transform Decimal fields to JS numbers */
  private transformLoan(loan: any) {
    if (!loan) return null;
    return {
      ...loan,
      amount: Number(loan.amount),
      interestRate: Number(loan.interestRate),
      tenor: Number(loan.tenor),
      numberOfInstallments: Number(loan.numberOfInstallments),
    };
  }

async create(dto: CreateLoanDto) {
  return await this.prisma.$transaction(async (tx) => {
    // 1. Create the loan with PENDING status
    const loan = await tx.loan.create({
      data: { ...dto, status: LoanStatus.PENDING },
    });

    // 2. Create the disbursement record with PENDING status
    await tx.disbursement.create({
      data: {
        loanId: loan.id,
        amount: loan.amount,
        disbursementDate: new Date(),
        status: DisbursementStatus.PENDING,
      },
    });

    return this.transformLoan(loan);
  });
}


  async findAll() {
    const loans = await this.prisma.loan.findMany({ include: { client: true } });
    return loans.map(this.transformLoan);
  }

  async findOne(id: string) {
    const loan = await this.prisma.loan.findUnique({ where: { id }, include: { client: true } });
    if (!loan) throw new NotFoundException('Loan not found');
    return this.transformLoan(loan);
  }

  async update(id: string, dto: UpdateLoanDto) {
    const loan = await this.findOne(id);
    if (loan.status !== LoanStatus.PENDING) {
      throw new BadRequestException('Only pending loans can be updated');
    }

    const updated = await this.prisma.loan.update({
      where: { id },
      data: dto,
      include: { client: true },
    });
    return this.transformLoan(updated);
  }


async approveOrReject(id: string, dto: ApproveLoanDto) {
  const loan = await this.findOne(id);
  
  if (loan.status !== LoanStatus.PENDING) {
    throw new BadRequestException('Only pending loans can be approved or rejected');
  }

  const updated = await this.prisma.loan.update({
    where: { id },
    data: { status: dto.status },
    include: { client: true },
  });

  return this.transformLoan(updated);
}

  async getAuditTrail(loanId: string) {
    const loan = await this.prisma.loan.findUnique({ where: { id: loanId } });
    if (!loan) throw new BadRequestException('Loan not found');

    const auditLogs = await this.prisma.auditLog.findMany({
      where: { ledgerEntry: { loanId } },
      include: { ledgerEntry: true, user: true },
      orderBy: { createdAt: 'desc' },
    });

    return auditLogs;
  }
}
