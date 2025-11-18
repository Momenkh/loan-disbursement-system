import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { UpdateKycDto } from './dto/update-kyc.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/guards/roles.decorator';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';

@ApiTags('clients')
@ApiBearerAuth()
@Controller('clients')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ClientsController {
  constructor(private readonly service: ClientsService) {}

  @Post()
  @Roles('staff', 'admin')
  @ApiOperation({ summary: 'Create a client' })
  @ApiCreatedResponse({ description: 'Client created', type: CreateClientDto })
  @ApiBadRequestResponse({ description: 'Invalid input' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiBody({ type: CreateClientDto })
  create(@Body() dto: CreateClientDto) {
    return this.service.create(dto);
  }

  @Get()
  @Roles('staff', 'admin')
  @ApiOperation({ summary: 'List clients' })
  @ApiOkResponse({ description: 'List returned' })
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @Roles('staff', 'admin')
  @ApiOperation({ summary: 'Get client by id' })
  @ApiOkResponse({ description: 'Client returned' })
  @ApiNotFoundResponse({ description: 'Client not found' })
  @ApiParam({ name: 'id', description: 'Client id' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @Roles('staff', 'admin')
  @ApiOperation({ summary: 'Update client' })
  @ApiOkResponse({ description: 'Client updated' })
  @ApiBadRequestResponse({ description: 'Invalid input' })
  @ApiParam({ name: 'id', description: 'Client id' })
  update(@Param('id') id: string, @Body() dto: UpdateClientDto) {
    return this.service.update(id, dto);
  }

  @Patch(':id/kyc')
  @Roles('admin', 'system') // Only higher roles can change KYC status
  @ApiOperation({ summary: 'Update client KYC status' })
  @ApiOkResponse({ description: 'KYC updated' })
  @ApiBadRequestResponse({ description: 'Invalid input' })
  @ApiParam({ name: 'id', description: 'Client id' })
  updateKyc(@Param('id') id: string, @Body() dto: UpdateKycDto) {
    return this.service.updateKyc(id, dto);
  }

  @Delete(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Delete client' })
  @ApiOkResponse({ description: 'Client deleted' })
  @ApiNotFoundResponse({ description: 'Client not found' })
  @ApiParam({ name: 'id', description: 'Client id' })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}