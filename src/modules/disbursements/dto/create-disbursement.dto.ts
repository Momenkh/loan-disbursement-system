import { IsString, IsNumber, IsDate, IsDecimal } from 'class-validator';

export class CreateDisbursementDto {
  @IsString()
  loanId: string;

  @IsString()
  clientId: string;

  @IsNumber()
  amount: number;

  @IsString()
  currency: string;

  @IsDate()
  disbursementDate: Date;

  @IsDate()
  firstPaymentDate: Date;

  @IsNumber()
  tenor: number; // months

  @IsNumber()
  interestRate: number; // annual percentage
}