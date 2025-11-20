import { IsString, IsNumber, IsDate, IsDecimal } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateDisbursementDto {
  @ApiProperty({ example: 'loan_abc123', description: 'Loan identifier' })
  @IsString()
  loanId: string;

  @ApiProperty({ example: 'client_xyz', description: 'Client identifier' })
  @IsString()
  clientId: string;

  @ApiProperty({ example: 1000.5, description: 'Disbursement amount' })
  @IsNumber()
  amount: number;

  @ApiProperty({ example: 'USD', description: 'Currency code' })
  @IsString()
  currency: string;

  @ApiProperty({ example: '2025-01-01T00:00:00.000Z', description: 'Date of disbursement' })
  @IsDate()
  disbursementDate: Date;

  @ApiProperty({ example: '2025-02-01T00:00:00.000Z', description: 'First payment date' })
  @IsDate()
  firstPaymentDate: Date;

  @ApiProperty({ example: 12, description: 'Tenor in months' })
  @IsNumber()
  tenor: number; // months

  @ApiProperty({ example: 12.5, description: 'Annual interest rate percentage' })
  @IsNumber()
  interestRate: number; // annual percentage
}