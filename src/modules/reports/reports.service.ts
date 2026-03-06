import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Order, OrderDocument } from '../orders/schemas/order.schema';
import { IVRRequest, IVRRequestDocument } from '../insurance/schemas/ivr-request.schema';
import { User, UserDocument } from '../users/schemas/user.schema';

@Injectable()
export class ReportsService {
  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(IVRRequest.name) private ivrModel: Model<IVRRequestDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async getOverview() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [
      totalOrders,
      pendingOrders,
      approvedOrders,
      completedOrders,
      todayOrders,
      totalIVR,
      pendingIVR,
      approvedIVR,
      rejectedIVR,
      activeSalesReps,
      monthlyOrders,
    ] = await Promise.all([
      this.orderModel.countDocuments(),
      this.orderModel.countDocuments({ status: 'submitted' }),
      this.orderModel.countDocuments({ status: 'approved' }),
      this.orderModel.countDocuments({ status: 'completed' }),
      this.orderModel.countDocuments({ createdAt: { $gte: startOfToday } }),
      this.ivrModel.countDocuments(),
      this.ivrModel.countDocuments({ status: 'pending' }),
      this.ivrModel.countDocuments({ status: 'approved' }),
      this.ivrModel.countDocuments({ status: 'rejected' }),
      this.userModel.countDocuments({ role: 'sales_rep', isActive: true }),
      this.orderModel.countDocuments({ createdAt: { $gte: startOfMonth } }),
    ]);

    const shippedToday = await this.orderModel.countDocuments({
      status: 'shipped',
      updatedAt: { $gte: startOfToday },
    });

    return {
      orders: { total: totalOrders, pending: pendingOrders, approved: approvedOrders, completed: completedOrders, today: todayOrders, monthly: monthlyOrders },
      ivr: { total: totalIVR, pending: pendingIVR, approved: approvedIVR, rejected: rejectedIVR },
      salesReps: { active: activeSalesReps },
      shippedToday,
      approvalRate: totalIVR > 0 ? Math.round((approvedIVR / totalIVR) * 100) : 0,
    };
  }

  async exportOrders(query: any) {
    const filter: any = {};
    if (query.dateFrom) {
      const from = new Date(query.dateFrom);
      from.setHours(0, 0, 0, 0);
      filter.createdAt = { $gte: from };
    }
    if (query.dateTo) {
      const to = new Date(query.dateTo);
      to.setHours(23, 59, 59, 999);
      filter.createdAt = { ...filter.createdAt, $lte: to };
    }

    const orders = await this.orderModel
      .find(filter)
      .populate('doctor', 'firstName lastName')
      .populate('product', 'name sku price')
      .populate('patient', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .lean();

    const header = 'Order ID,Patient,Doctor,Product,Quantity,Status,Priority,Date\n';
    const rows = orders.map((o: any) => {
      const patientName = o.patientName || `${o.patient?.firstName || ''} ${o.patient?.lastName || ''}`.trim() || 'N/A';
      const doctorName = `${o.doctor?.firstName || ''} ${o.doctor?.lastName || ''}`.trim() || 'N/A';
      const productName = o.product?.name || 'N/A';
      return `${o.orderId},"${patientName}","${doctorName}","${productName}",${o.quantity},${o.status},${o.priority || 'normal'},${new Date(o.createdAt).toLocaleDateString()}`;
    }).join('\n');

    return header + rows;
  }

  async exportIVR(query: any) {
    const filter: any = {};
    if (query.dateFrom) {
      const from = new Date(query.dateFrom);
      from.setHours(0, 0, 0, 0);
      filter.createdAt = { $gte: from };
    }
    if (query.dateTo) {
      const to = new Date(query.dateTo);
      to.setHours(23, 59, 59, 999);
      filter.createdAt = { ...filter.createdAt, $lte: to };
    }

    const ivrs = await this.ivrModel.find(filter).sort({ createdAt: -1 }).lean();

    const header = 'Request ID,Patient,Insurance,Status,Date\n';
    const rows = ivrs.map((i: any) =>
      `${i.requestId},"${i.patient?.firstName || ''} ${i.patient?.lastName || ''}","${i.insurance?.insuranceName || ''}",${i.status},${new Date(i.createdAt).toLocaleDateString()}`,
    ).join('\n');

    return header + rows;
  }
}
