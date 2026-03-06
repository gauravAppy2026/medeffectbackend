import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { DoctorsService } from './doctors.service';
import { CreateDoctorDto } from './dto/create-doctor.dto';
import { UpdateDoctorDto } from './dto/update-doctor.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller()
@UseGuards(JwtAuthGuard)
export class DoctorsController {
  constructor(private readonly doctorsService: DoctorsService) {}

  @Get('doctors')
  async findActive() {
    return this.doctorsService.findActive();
  }

  @Get('admin/doctors')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async findAll(@Query() query: any) {
    return this.doctorsService.findAll(query);
  }

  @Post('admin/doctors')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async create(@Body() createDto: CreateDoctorDto) {
    return this.doctorsService.create(createDto);
  }

  @Put('admin/doctors/:id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async update(@Param('id') id: string, @Body() updateDto: UpdateDoctorDto) {
    return this.doctorsService.update(id, updateDto);
  }

  @Delete('admin/doctors/:id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async delete(@Param('id') id: string) {
    return this.doctorsService.delete(id);
  }
}
