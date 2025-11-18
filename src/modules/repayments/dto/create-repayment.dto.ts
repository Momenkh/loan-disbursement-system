import { IsString, IsNumber, IsDate, Min } from 'class-validator';

export class CreateRepaymentDto {
  @IsString()
  loanId: string;

  @IsString()
  clientId: string;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsDate()
  paymentDate: Date;
}