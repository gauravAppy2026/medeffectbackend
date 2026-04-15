import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto, AssignOrderDto, UpdateTrackingDto } from './dto/update-order.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller()
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post('orders')
  async create(@CurrentUser() user: any, @Body() createDto: CreateOrderDto) {
    return this.ordersService.create(user, createDto);
  }

  @Get('orders')
  async findAll(@CurrentUser() user: any, @Query() query: any) {
    return this.ordersService.findAll(user, query);
  }

  @Get('orders/status-counts')
  async getStatusCounts(@CurrentUser() user: any) {
    return this.ordersService.getStatusCounts(user._id, user.role);
  }

  @Get('orders/:id')
  async findById(@Param('id') id: string, @CurrentUser() user: any) {
    return this.ordersService.findById(id, user);
  }

  @Put('admin/orders/:id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async updateStatus(
    @Param('id') id: string,
    @CurrentUser('_id') adminId: string,
    @Body() updateDto: UpdateOrderDto,
  ) {
    return this.ordersService.updateStatus(id, adminId, updateDto);
  }

  @Put('admin/orders/:id/assign')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async assignSalesRep(
    @Param('id') id: string,
    @CurrentUser('_id') adminId: string,
    @Body() assignDto: AssignOrderDto,
  ) {
    return this.ordersService.assignSalesRep(id, adminId, assignDto);
  }

  @Put('admin/orders/:id/tracking')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async updateTracking(
    @Param('id') id: string,
    @CurrentUser('_id') adminId: string,
    @Body() trackingDto: UpdateTrackingDto,
  ) {
    return this.ordersService.updateTracking(id, adminId, trackingDto);
  }
}
