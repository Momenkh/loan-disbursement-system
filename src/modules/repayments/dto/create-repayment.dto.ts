import { IsString, IsNumber, IsDate, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateRepaymentDto {
  @ApiProperty({ example: 'loan_abc123', description: 'Loan identifier' })
  @IsString()
  loanId: string;

  @ApiProperty({ example: 'client_xyz', description: 'Client identifier' })
  @IsString()
  clientId: string;

  @ApiProperty({ example: 150.75, description: 'Repayment amount' })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({ example: '2025-02-01T00:00:00.000Z', description: 'Date of payment' })
  @Type(() => Date)
  @IsDate()
  paymentDate: Date;
}