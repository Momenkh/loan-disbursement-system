import { IsString, IsIn } from 'class-validator';

export class UpdateKycDto {
  @IsString()
  @IsIn(['pending', 'verified', 'rejected'])
  kycStatus: string;
}