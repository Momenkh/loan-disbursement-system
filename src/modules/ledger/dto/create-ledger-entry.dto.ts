import { IsString, IsNumber, Min, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TransactionType } from '@prisma/client';

export class CreateLedgerEntryDto {
  @ApiProperty({ example: 'DISBURSEMENT', description: 'Type of the transaction' })
  @IsEnum(TransactionType)
  transactionType: TransactionType;

  @ApiProperty({ example: 'cash_account', description: 'Debit account name' })
  @IsString()
  debitAccountId: string;

  @ApiProperty({ example: 'revenue_account', description: 'Credit account name' })
  @IsString()
  creditAccountId: string;

  @ApiProperty({ example: 100.5, description: 'Amount for the ledger entry' })
  @IsNumber()
  @Min(0)
  amount: number;
}