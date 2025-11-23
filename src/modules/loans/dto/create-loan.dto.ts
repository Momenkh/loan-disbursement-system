import { IsString, IsNumber, Min, IsInt } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Decimal } from '@prisma/client/runtime/library';
import { Type } from 'class-transformer';

export class CreateLoanDto {
  @ApiProperty({ example: 'client_abc123', description: 'Client identifier' })
  @IsString()
  clientId: string;

  @ApiProperty({ example: 5000, description: 'Principal loan amount' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({ example: 12, description: 'Number of installments' })
  @Type(() => Number)
  @IsInt()
  @Min(2)
  numberOfInstallments: number;

  @ApiProperty({ example: 12.5, description: 'Annual interest rate percentage' })  
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  interestRate: Decimal;

  @ApiProperty({ example: 12, description: 'Loan tenor in months' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  tenor: number;
}