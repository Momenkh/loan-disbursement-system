import { IsString, IsNumber, Min, IsInt } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateLoanDto {
  @ApiProperty({ example: 'client_abc123', description: 'Client identifier' })
  @IsString()
  clientId: string;

  @ApiProperty({ example: 'personal_loan', description: 'Loan product type' })
  @IsString()
  type: string; // loan product

  @ApiProperty({ example: 5000, description: 'Principal loan amount' })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({ example: 12.5, description: 'Annual interest rate percentage' })
  @IsNumber()
  @Min(0)
  interestRate: number;

  @ApiProperty({ example: 12, description: 'Loan tenor in months' })
  @IsInt()
  @Min(1)
  tenor: number; // months
}