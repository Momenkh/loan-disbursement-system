import { IsString, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateKycDto {
  @ApiProperty({ example: 'pending', enum: ['pending', 'verified', 'rejected'] })
  @IsString()
  @IsIn(['pending', 'verified', 'rejected'])
  kycStatus: string;
}