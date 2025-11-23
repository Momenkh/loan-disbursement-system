import { IsOptional, IsNumber, Min, IsString, IsInt } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateLoanDto {
  @ApiPropertyOptional({ example: 5000, description: 'Updated principal amount' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @ApiPropertyOptional({ example: 12, description: 'Number of installments' })
  @IsInt()
  @Min(2)
  numberOfInstallments?: number;

  @ApiPropertyOptional({ example: 12.5, description: 'Updated annual interest rate percentage' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  interestRate?: number;

  @ApiPropertyOptional({ example: 12, description: 'Updated tenor in months' })
  @IsOptional()
  @IsInt()
  @Min(1)
  tenor?: number;

}