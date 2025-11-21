import { IsIn, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { LoanStatus } from '@prisma/client';

export class ApproveLoanDto {
  @ApiProperty({ 
    example: LoanStatus.APPROVED, 
    enum: [LoanStatus.APPROVED, LoanStatus.REJECTED] })
  @IsEnum(LoanStatus)
  @IsIn([LoanStatus.APPROVED, LoanStatus.REJECTED])
  status: LoanStatus;
}