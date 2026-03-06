import { Controller, Get, Put, Param, Body, UseGuards } from '@nestjs/common';
import { CmsService } from './cms.service';
import { UpdateCmsDto } from './dto/update-cms.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller()
export class CmsController {
  constructor(private readonly cmsService: CmsService) {}

  @Get('cms/:key')
  @UseGuards(JwtAuthGuard)
  async findByKey(@Param('key') key: string) {
    return this.cmsService.findByKey(key);
  }

  @Get('admin/cms')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async findAll() {
    return this.cmsService.findAll();
  }

  @Put('admin/cms/:key')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async updateByKey(@Param('key') key: string, @Body() updateDto: UpdateCmsDto) {
    return this.cmsService.updateByKey(key, updateDto);
  }
}
