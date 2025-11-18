import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { CreateLoanDto } from './dto/create-loan.dto';
import { UpdateLoanDto } from './dto/update-loan.dto';
import { ApproveLoanDto } from './dto/approve-loan.dto';

@Injectable()
export class LoansService {
  private prisma = new PrismaClient();

  async create(dto: CreateLoanDto) {
    return this.prisma.loan.create({
      data: { ...dto, status: 'draft' },
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
    if (loan.status !== 'draft') {
      throw new BadRequestException('Only draft loans can be submitted');
    }
    return this.prisma.loan.update({ where: { id }, data: { status: 'submitted' } });
  }

  async approveOrReject(id: string, dto: ApproveLoanDto) {
    const loan = await this.findOne(id);
    if (loan.status !== 'submitted') {
      throw new BadRequestException('Only submitted loans can be approved or rejected');
    }
    return this.prisma.loan.update({ where: { id }, data: { status: dto.status } });
  }
}