import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('admin/reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('overview')
  async getOverview() {
    return this.reportsService.getOverview();
  }

  @Get('export')
  async exportReport(@Query() query: any, @Res() res: Response) {
    const { type = 'orders', dateFrom, dateTo } = query;

    let csv: string;
    if (type === 'ivr') {
      csv = await this.reportsService.exportIVR({ dateFrom, dateTo });
    } else {
      csv = await this.reportsService.exportOrders({ dateFrom, dateTo });
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=${type}-report.csv`);
    res.send(csv);
  }
}
