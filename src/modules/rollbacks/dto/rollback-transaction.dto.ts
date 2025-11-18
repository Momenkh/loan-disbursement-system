import { IsString } from 'class-validator';

export class RollbackTransactionDto {
  @IsString()
  transactionId: string;

  @IsString()
  reason: string;

  @IsString()
  rolledBackBy: string;
}