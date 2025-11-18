import { IsString, IsNumber, Min, IsInt } from 'class-validator';

export class CreateLoanDto {
  @IsString()
  clientId: string;

  @IsString()
  type: string; // loan product

  @IsNumber()
  @Min(0)
  amount: number;

  @IsNumber()
  @Min(0)
  interestRate: number;

  @IsInt()
  @Min(1)
  tenor: number; // months
}