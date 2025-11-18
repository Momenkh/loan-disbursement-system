import { IsString, IsIn } from 'class-validator';

export class ApproveLoanDto {
  @IsString()
  @IsIn(['approved', 'rejected'])
  status: 'approved' | 'rejected';
}