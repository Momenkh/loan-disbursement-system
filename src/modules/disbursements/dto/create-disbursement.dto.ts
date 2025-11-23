import { IsString, IsNumber, IsOptional, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateDisbursementDto {
  @ApiProperty({ example: 'loan_abc123', description: 'Loan identifier' })
  @IsString()
  loanId: string;

  @ApiProperty({ example: 10000, description: 'Disbursement amount' })
  @IsNumber()
  amount: number;

  @ApiProperty({ 
    example: '2025-01-01', 
    description: 'Date of disbursement',
    required: false 
  })
  @IsOptional()
  @IsDateString()
  disbursementDate?: Date;
}