import { Controller, Get, Put, Post, Body, Query, Param, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller()
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('user/profile')
  async getProfile(@CurrentUser('_id') userId: string) {
    return this.usersService.getProfile(userId);
  }

  @Put('user/profile')
  async updateProfile(
    @CurrentUser('_id') userId: string,
    @Body() updateDto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(userId, updateDto);
  }

  @Get('admin/users')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async listUsers(@Query() query: PaginationDto & { role?: string }) {
    return this.usersService.listUsers(query);
  }

  @Post('admin/users')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async createUser(@Body() createDto: CreateUserDto) {
    return this.usersService.createUser(createDto);
  }

  @Get('admin/users/:id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async getUserById(@Param('id') id: string) {
    return this.usersService.getUserById(id);
  }

  @Put('admin/users/:id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async updateUser(@Param('id') id: string, @Body() updateDto: UpdateUserDto) {
    return this.usersService.updateUser(id, updateDto);
  }
}
