import { IsOptional, IsNumber, Min, IsString, IsInt } from 'class-validator';

export class UpdateLoanDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  interestRate?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  tenor?: number;

  @IsOptional()
  @IsString()
  type?: string;
}