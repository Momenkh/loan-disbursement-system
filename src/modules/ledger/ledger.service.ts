import { Injectable, Logger } from '@nestjs/common';
import { CreateLedgerEntryDto } from './dto/create-ledger-entry.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class LedgerService {

  constructor(private prisma: PrismaService, private readonly auditService: AuditService) {}

  private logger = new Logger(LedgerService.name);

  async createLedgerEntry(dto: CreateLedgerEntryDto) {
    // Ensure debit is not the credit
    if (dto.debitAccountId === dto.creditAccountId) {
      throw new Error('Debit and credit accounts must differ');
    }

    const entry = await this.prisma.ledgerEntry.create({
      data: {
        transactionType: dto.transactionType,
        debitAccountId: dto.debitAccountId,
        creditAccountId: dto.creditAccountId,
        amount: +dto.amount.toFixed(2),
      },
    });

    await this.auditService.logTransaction(
      entry.id,                         // real transaction ID
      'ledger_entry_created',           // operation
      'ay had for now',                 // optional user
      {
        transactionType: dto.transactionType,
        debitAccountId: dto.debitAccountId,
        creditAccountId: dto.creditAccountId,
        amount: dto.amount,
      },
    );
    
    this.logger.log({
      message: 'Ledger entry created',
      transactionType: dto.transactionType,
      debitAccountId: dto.debitAccountId,
      creditAccountId: dto.creditAccountId,
      amount: dto.amount,
    });

    return entry;
  }

  async getAccountBalance(accountName: string) {
    const debitSum = await this.prisma.ledgerEntry.aggregate({
      _sum: { amount: true },
      where: { debitAccountId: accountName },
    });

    const creditSum = await this.prisma.ledgerEntry.aggregate({
      _sum: { amount: true },
      where: { creditAccountId: accountName },
    });

    const balance = (Number(debitSum._sum.amount || 0) - Number(creditSum._sum.amount || 0));
    return +balance.toFixed(2);
  }
}