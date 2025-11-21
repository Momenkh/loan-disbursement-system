import { Controller, Post, Body, UseGuards, Get, Param } from '@nestjs/common';
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
  @Roles('STAFF', 'ADMIN')
  @ApiOperation({ summary: 'Create a disbursement' })
  @ApiCreatedResponse({ description: 'Disbursement created', type: CreateDisbursementDto })
  @ApiBadRequestResponse({ description: 'Invalid input' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiBody({ type: CreateDisbursementDto })
  create(@Body() dto: CreateDisbursementDto) {
    return this.service.createDisbursement(dto);
  }

  @Get()
  @Roles('STAFF', 'ADMIN')
  @ApiOperation({ summary: 'Get all disbursements' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  findAll() {
    return this.service.getAllDisbursements();
  }

  @Get(':id')
  @Roles('STAFF', 'ADMIN')
  @ApiOperation({ summary: 'Get disbursement by ID' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  getById(@Param('id') id: string) {
    return this.service.getDisbursementById(id);
  }

  @Post(':id/rollback')
  @Roles('STAFF', 'ADMIN')
  @ApiOperation({ summary: 'Rollback a disbursement' })
  @ApiCreatedResponse({ description: 'Disbursement rolled back' })
  @ApiBadRequestResponse({ description: 'Invalid input' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  rollbackDisbursement(@Param('id') id: string) {
    return this.service.rollbackDisbursement(id);
  }
}