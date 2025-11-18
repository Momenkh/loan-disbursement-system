import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { CreateLedgerEntryDto } from './dto/create-ledger-entry.dto';

@Injectable()
export class LedgerService {
  private prisma = new PrismaClient();
  private logger = new Logger(LedgerService.name);

  async createLedgerEntry(dto: CreateLedgerEntryDto) {
    // Ensure debit ≠ credit
    if (dto.debitAccount === dto.creditAccount) {
      throw new Error('Debit and credit accounts must differ');
    }

    const entry = await this.prisma.ledgerEntry.create({
      data: {
        transactionId: dto.transactionId,
        debitAccount: dto.debitAccount,
        creditAccount: dto.creditAccount,
        amount: +dto.amount.toFixed(2),
      },
    });

    this.logger.log({
      message: 'Ledger entry created',
      transactionId: dto.transactionId,
      debit: dto.debitAccount,
      credit: dto.creditAccount,
      amount: dto.amount,
    });

    return entry;
  }

  // Optional: get account balance
  async getAccountBalance(accountName: string) {
    const debitSum = await this.prisma.ledgerEntry.aggregate({
      _sum: { amount: true },
      where: { debitAccount: accountName },
    });

    const creditSum = await this.prisma.ledgerEntry.aggregate({
      _sum: { amount: true },
      where: { creditAccount: accountName },
    });

    const balance = (Number(debitSum._sum.amount || 0) - Number(creditSum._sum.amount || 0));
    return +balance.toFixed(2);
  }
}