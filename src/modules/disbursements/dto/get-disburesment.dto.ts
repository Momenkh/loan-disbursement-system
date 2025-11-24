import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class GetDisbursementDto {
    @ApiProperty({ example: 'disb_abc123', description: 'Disbursement identifier' })
    @IsString()
    disbursementId: string;
}