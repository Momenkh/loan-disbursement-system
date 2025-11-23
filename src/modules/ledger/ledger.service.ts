import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { TransactionType } from '@prisma/client';
import { CreateLedgerEntryDto } from './dto/create-ledger-entry.dto';

@Injectable()
export class LedgerService {
  constructor(
    private prisma: PrismaService,
    private readonly auditService: AuditService
  ) {}

  private logger = new Logger(LedgerService.name);

  // Keep this method for when you need it outside transactions
  async logLedgerTransaction(dto: CreateLedgerEntryDto) {
    await this.auditService.logTransaction(
      dto.ledgerEntryId,
      dto.transactionType,
      dto.userId,
      {
        transactionType: dto.transactionType,
        debitAccountId: dto.debitAccountId,
        creditAccountId: dto.creditAccountId,
        amount: dto.amount,
      },
    );

    this.logger.log({
      message: 'Ledger transaction logged',
      transactionType: dto.transactionType,
      debitAccountId: dto.debitAccountId,
      creditAccountId: dto.creditAccountId,
      amount: dto.amount,
      userId: dto.userId,
    });
  }

  async getAccountBalance(accountName: string) {
    const account = await this.prisma.account.findUnique({
      where: { name: accountName },
    });

    if (!account) {
      throw new NotFoundException(`Account ${accountName} not found`);
    }

    return Number(account.balance);
  }

  async getAllAccounts() {
    return this.prisma.account.findMany();
  }
}