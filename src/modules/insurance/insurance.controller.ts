import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { InsuranceService } from './insurance.service';
import { CreateIVRDto } from './dto/create-ivr.dto';
import { UpdateIVRDto } from './dto/update-ivr.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller()
@UseGuards(JwtAuthGuard)
export class InsuranceController {
  constructor(private readonly insuranceService: InsuranceService) {}

  @Post('insurance/verify')
  async create(@CurrentUser() user: any, @Body() createDto: CreateIVRDto) {
    return this.insuranceService.create(user._id, createDto);
  }

  @Get('ivr')
  async findAll(@CurrentUser() user: any, @Query() query: any) {
    return this.insuranceService.findAll(user, query);
  }

  @Get('ivr/status-counts')
  async getStatusCounts(@CurrentUser() user: any) {
    return this.insuranceService.getStatusCounts(user._id, user.role);
  }

  @Get('ivr/:id')
  async findById(@Param('id') id: string) {
    return this.insuranceService.findById(id);
  }

  @Put('admin/ivr/:id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async update(
    @Param('id') id: string,
    @CurrentUser('_id') adminId: string,
    @Body() updateDto: UpdateIVRDto,
  ) {
    return this.insuranceService.update(id, adminId, updateDto);
  }
}
