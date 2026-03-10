import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Order, OrderDocument } from './schemas/order.schema';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto, AssignOrderDto, UpdateTrackingDto } from './dto/update-order.dto';

@Injectable()
export class OrdersService {
  constructor(@InjectModel(Order.name) private orderModel: Model<OrderDocument>) {}

  private parseDeliveryDate(dateStr: string): Date | undefined {
    if (!dateStr) return undefined;
    // Try ISO format first
    const isoDate = new Date(dateStr);
    if (!isNaN(isoDate.getTime())) return isoDate;
    // Try DD/MM/YYYY format
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const [day, month, year] = parts.map(Number);
      const parsed = new Date(year, month - 1, day);
      if (!isNaN(parsed.getTime())) return parsed;
    }
    return undefined;
  }

  async create(user: any, createDto: CreateOrderDto) {
    const userId = user._id;
    const count = await this.orderModel.countDocuments();
    const orderId = `ORD-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    const orderData: any = {
      ...createDto,
      orderId,
      patient: userId,
      status: 'submitted',
      statusHistory: [
        { status: 'submitted', changedBy: userId, changedAt: new Date(), note: 'Order created' },
      ],
    };

    // Build lineItems from either lineItems array or single product/quantity
    if (createDto.lineItems && createDto.lineItems.length > 0) {
      orderData.lineItems = createDto.lineItems;
      // Set first item as primary product for backward compat
      orderData.product = createDto.lineItems[0].product;
      orderData.quantity = createDto.lineItems[0].quantity;
    } else if (createDto.product && createDto.quantity) {
      orderData.lineItems = [{ product: createDto.product, quantity: createDto.quantity }];
    }

    // Auto-assign sales rep if the creator is a sales rep
    if (user.role === 'sales_rep') {
      orderData.salesRep = userId;
    }

    // Parse deliveryDate string into a proper Date
    if (createDto.deliveryDate) {
      const parsed = this.parseDeliveryDate(createDto.deliveryDate);
      if (parsed) {
        orderData.deliveryDate = parsed;
      } else {
        delete orderData.deliveryDate;
      }
    }

    const order = await this.orderModel.create(orderData);

    return order.populate(['doctor', 'product', 'salesRep', { path: 'lineItems.product', model: 'Product' }]);
  }

  async findAll(user: any, query: any) {
    const { page = 1, limit = 20, status, search } = query;
    const filter: any = {};

    if (user.role === 'patient') {
      filter.patient = user._id;
    } else if (user.role === 'sales_rep') {
      filter.salesRep = user._id;
    }

    if (status && status !== 'all') filter.status = status;
    if (search) {
      filter.$or = [
        { orderId: { $regex: search, $options: 'i' } },
        { patientName: { $regex: search, $options: 'i' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.orderModel
        .find(filter)
        .populate('doctor', 'firstName lastName department')
        .populate('product', 'name sku price')
        .populate('salesRep', 'firstName lastName email')
        .populate('patient', 'firstName lastName email')
        .populate('lineItems.product', 'name sku price')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      this.orderModel.countDocuments(filter),
    ]);

    return { data, total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / limit) };
  }

  async findById(orderId: string) {
    const order = await this.orderModel
      .findById(orderId)
      .populate('doctor')
      .populate('product')
      .populate('salesRep', 'firstName lastName email phone')
      .populate('patient', 'firstName lastName email phone address')
      .populate('lineItems.product', 'name sku price')
      .lean();

    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async updateStatus(orderId: string, adminId: string, updateDto: UpdateOrderDto) {
    const order = await this.orderModel.findById(orderId);
    if (!order) throw new NotFoundException('Order not found');

    const validTransitions: Record<string, string[]> = {
      submitted: ['approved', 'rejected'],
      approved: ['shipped', 'cancelled'],
      shipped: ['completed'],
    };

    if (updateDto.status) {
      const allowed = validTransitions[order.status] || [];
      if (!allowed.includes(updateDto.status)) {
        throw new BadRequestException(
          `Cannot transition from '${order.status}' to '${updateDto.status}'`,
        );
      }

      order.status = updateDto.status;
      if (updateDto.rejectionReason) order.rejectionReason = updateDto.rejectionReason;

      order.statusHistory.push({
        status: updateDto.status,
        changedBy: adminId as any,
        changedAt: new Date(),
        note: updateDto.note || `Status changed to ${updateDto.status}`,
      });
    }

    await order.save();
    return order.populate(['doctor', 'product', 'salesRep', { path: 'lineItems.product', model: 'Product' }]);
  }

  async assignSalesRep(orderId: string, adminId: string, assignDto: AssignOrderDto) {
    const order = await this.orderModel.findByIdAndUpdate(
      orderId,
      {
        salesRep: assignDto.salesRepId,
        $push: {
          statusHistory: {
            status: 'assigned',
            changedBy: adminId,
            changedAt: new Date(),
            note: 'Sales rep assigned',
          },
        },
      },
      { new: true },
    ).populate(['doctor', 'product', 'salesRep']);

    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async updateTracking(orderId: string, adminId: string, trackingDto: UpdateTrackingDto) {
    const order = await this.orderModel.findByIdAndUpdate(
      orderId,
      {
        trackingNumber: trackingDto.trackingNumber,
        $push: {
          statusHistory: {
            status: 'tracking_added',
            changedBy: adminId,
            changedAt: new Date(),
            note: `Tracking: ${trackingDto.trackingNumber}`,
          },
        },
      },
      { new: true },
    );

    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async getStatusCounts(userId?: string, role?: string) {
    const match: any = {};
    if (role === 'patient') match.patient = userId;
    if (role === 'sales_rep') match.salesRep = userId;

    const counts = await this.orderModel.aggregate([
      { $match: match },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    const result: Record<string, number> = {
      submitted: 0, approved: 0, shipped: 0, completed: 0, rejected: 0, cancelled: 0,
    };
    counts.forEach((c) => { result[c._id] = c.count; });
    return result;
  }
}
