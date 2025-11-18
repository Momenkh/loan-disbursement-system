import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { DisbursementsService } from './disbursements.service';
import { CreateDisbursementDto } from './dto/create-disbursement.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/guards/roles.decorator';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiCreatedResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiBody,
} from '@nestjs/swagger';

@ApiTags('disbursements')
@ApiBearerAuth()
@Controller('disbursements')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DisbursementsController {
  constructor(private service: DisbursementsService) {}

  @Post()
  @Roles('staff', 'admin')
  @ApiOperation({ summary: 'Create a disbursement' })
  @ApiCreatedResponse({ description: 'Disbursement created', type: CreateDisbursementDto })
  @ApiBadRequestResponse({ description: 'Invalid input' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiBody({ type: CreateDisbursementDto })
  create(@Body() dto: CreateDisbursementDto) {
    return this.service.createDisbursement(dto);
  }
}