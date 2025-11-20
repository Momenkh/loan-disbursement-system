import { IsString, IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateLedgerEntryDto {
  @ApiProperty({ example: 'tx_12345', description: 'Unique transaction id' })
  @IsString()
  transactionId: string;

  @ApiProperty({ example: 'cash_account', description: 'Debit account name' })
  @IsString()
  debitAccount: string;

  @ApiProperty({ example: 'revenue_account', description: 'Credit account name' })
  @IsString()
  creditAccount: string;

  @ApiProperty({ example: 100.5, description: 'Amount for the ledger entry' })
  @IsNumber()
  @Min(0)
  amount: number;
}