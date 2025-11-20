import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RollbackTransactionDto {
  @ApiProperty({ example: 'tx_12345', description: 'Transaction id to rollback' })
  @IsString()
  transactionId: string;

  @ApiProperty({ example: 'Duplicate charge', description: 'Reason for rollback' })
  @IsString()
  reason: string;

  @ApiProperty({ example: 'admin_user', description: 'User performing the rollback' })
  @IsString()
  rolledBackBy: string;
}