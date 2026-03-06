import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuditLog, AuditLogDocument } from './schemas/audit-log.schema';

@Injectable()
export class AuditService {
  constructor(
    @InjectModel(AuditLog.name) private auditModel: Model<AuditLogDocument>,
  ) {}

  async log(entry: Partial<AuditLog>) {
    try {
      await this.auditModel.create(entry);
    } catch (err) {
      // Never let audit logging break the app
      console.error('Audit log error:', err.message);
    }
  }

  async findAll(query: {
    page?: number;
    limit?: number;
    action?: string;
    resource?: string;
    userId?: string;
    dateFrom?: string;
    dateTo?: string;
    search?: string;
  }) {
    const page = query.page || 1;
    const limit = query.limit || 50;
    const filter: any = {};

    if (query.action) filter.action = query.action;
    if (query.resource) filter.resource = query.resource;
    if (query.userId) filter.userId = query.userId;

    if (query.dateFrom || query.dateTo) {
      filter.createdAt = {};
      if (query.dateFrom) {
        const from = new Date(query.dateFrom);
        from.setHours(0, 0, 0, 0);
        filter.createdAt.$gte = from;
      }
      if (query.dateTo) {
        const to = new Date(query.dateTo);
        to.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = to;
      }
    }

    if (query.search) {
      filter.$or = [
        { userEmail: { $regex: query.search, $options: 'i' } },
        { description: { $regex: query.search, $options: 'i' } },
        { endpoint: { $regex: query.search, $options: 'i' } },
        { resourceId: { $regex: query.search, $options: 'i' } },
      ];
    }

    const [logs, total] = await Promise.all([
      this.auditModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      this.auditModel.countDocuments(filter),
    ]);

    return {
      logs,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getStats() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const last7Days = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [todayCount, weekCount, failedLogins, recentActivity] =
      await Promise.all([
        this.auditModel.countDocuments({ createdAt: { $gte: today } }),
        this.auditModel.countDocuments({ createdAt: { $gte: last7Days } }),
        this.auditModel.countDocuments({
          action: 'LOGIN_FAILED',
          createdAt: { $gte: last7Days },
        }),
        this.auditModel
          .find()
          .sort({ createdAt: -1 })
          .limit(10)
          .lean(),
      ]);

    return { todayCount, weekCount, failedLogins, recentActivity };
  }
}
