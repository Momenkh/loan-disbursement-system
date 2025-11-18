import { IsString, IsNumber, Min } from 'class-validator';

export class CreateLedgerEntryDto {
  @IsString()
  transactionId: string;

  @IsString()
  debitAccount: string;

  @IsString()
  creditAccount: string;

  @IsNumber()
  @Min(0)
  amount: number;
}