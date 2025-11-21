import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { LoanStatus } from '@prisma/client';
import { CreateLoanDto } from './dto/create-loan.dto';
import { UpdateLoanDto } from './dto/update-loan.dto';
import { ApproveLoanDto } from './dto/approve-loan.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class LoansService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateLoanDto) {
    return this.prisma.loan.create({
      data: { ...dto, status: LoanStatus.PENDING },
    });
  }

  async findAll() {
    return this.prisma.loan.findMany({ include: { client: true } });
  }

  async findOne(id: string) {
    const loan = await this.prisma.loan.findUnique({ where: { id }, include: { client: true } });
    if (!loan) throw new NotFoundException('Loan not found');
    return loan;
  }

  async update(id: string, dto: UpdateLoanDto) {
    await this.findOne(id);
    return this.prisma.loan.update({ where: { id }, data: dto });
  }

  async submitForApproval(id: string) {
    const loan = await this.findOne(id);
    if (loan.status !== LoanStatus.PENDING) {
      throw new BadRequestException('Only pending loans can be approved');
    }
    return this.prisma.loan.update({ where: { id }, data: { status: LoanStatus.APPROVED } });
  }

  async approveOrReject(id: string, dto: ApproveLoanDto) {
    const loan = await this.findOne(id);
    if (loan.status !== LoanStatus.APPROVED) {
      throw new BadRequestException('Only approved loans can be approved or rejected');
    }
    return this.prisma.loan.update({ where: { id }, data: { status: dto.status } });
  }

   async getAuditTrail(loanId: string) {
    
    const loan = await this.prisma.loan.findUnique({ where: { id: loanId } });
    if (!loan) throw new BadRequestException('Loan not found');

    const auditLogs = await this.prisma.auditLog.findMany({
      where: {
        ledgerEntry: {
          loanId: loanId,
        },
      },
      include: {
        ledgerEntry: true,
        user: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return auditLogs;
  }
}