import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ShipmentsService } from './shipments.service';
import { CreateShipmentDto } from './dto/create-shipment.dto';
import { UpdateShipmentDto } from './dto/update-shipment.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('admin/shipments')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class ShipmentsController {
  constructor(private readonly shipmentsService: ShipmentsService) {}

  @Get()
  async findAll(@Query() query: any) {
    return this.shipmentsService.findAll(query);
  }

  @Post()
  async create(@Body() createDto: CreateShipmentDto) {
    return this.shipmentsService.create(createDto);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() updateDto: UpdateShipmentDto) {
    return this.shipmentsService.update(id, updateDto);
  }
}
