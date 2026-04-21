import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Order, OrderDocument } from './schemas/order.schema';
import { Shipment, ShipmentDocument } from '../shipments/schemas/shipment.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto, AssignOrderDto, UpdateTrackingDto } from './dto/update-order.dto';

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(Shipment.name) private shipmentModel: Model<ShipmentDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  private async getSalesRepFilter(userId: string): Promise<any> {
    const fullUser = await this.userModel
      .findById(userId)
      .select('assignedDoctors')
      .lean();
    const rawIds = fullUser?.assignedDoctors || [];
    const userObjId = new Types.ObjectId(userId);
    if (rawIds.length === 0) {
      return { salesRep: userObjId };
    }
    // Match both ObjectId and string forms of doctor — legacy records may
    // have been stored as strings while new records are ObjectIds.
    const assignedDoctorIds: any[] = [];
    rawIds.forEach((id: any) => {
      const s = id.toString();
      assignedDoctorIds.push(new Types.ObjectId(s));
      assignedDoctorIds.push(s);
    });
    return {
      $or: [
        { salesRep: userObjId },
        { doctor: { $in: assignedDoctorIds } },
      ],
    };
  }

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

    // Validate that at least one product is provided (either lineItems or product+quantity)
    const hasLineItems = createDto.lineItems && createDto.lineItems.length > 0;
    const hasSingleProduct = createDto.product && createDto.quantity;
    if (!hasLineItems && !hasSingleProduct) {
      throw new BadRequestException(
        'At least one product is required. Provide either lineItems or product with quantity.',
      );
    }

    const orderData: any = {
      ...createDto,
      orderId,
      patient: userId,
      status: 'submitted',
      statusHistory: [
        { status: 'submitted', changedBy: userId, changedAt: new Date(), note: 'Order created' },
      ],
    };

    // Explicitly cast reference fields to ObjectId — spreading a DTO (typed any)
    // bypasses Mongoose schema casting in some versions, causing IDs to be
    // persisted as strings and breaking $in queries.
    if (createDto.doctor) {
      orderData.doctor = new Types.ObjectId(createDto.doctor.toString());
    }

    // Build lineItems from either lineItems array or single product/quantity
    if (hasLineItems) {
      orderData.lineItems = createDto.lineItems!.map((li) => ({
        product: new Types.ObjectId(li.product.toString()),
        quantity: li.quantity,
      }));
      // Set first item as primary product for backward compat
      orderData.product = new Types.ObjectId(createDto.lineItems![0].product.toString());
      orderData.quantity = createDto.lineItems![0].quantity;
    } else if (hasSingleProduct) {
      const productObjId = new Types.ObjectId(createDto.product!.toString());
      orderData.product = productObjId;
      orderData.lineItems = [{ product: productObjId, quantity: createDto.quantity }];
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

    return order.populate([
      { path: 'doctor' },
      { path: 'product' },
      { path: 'salesRep', select: 'firstName lastName email phone' },
      { path: 'lineItems.product', model: 'Product' },
    ]);
  }

  async findAll(user: any, query: any) {
    const { page = 1, limit = 20, status, search } = query;
    const filter: any = {};

    if (user.role === 'patient') {
      filter.patient = user._id;
    } else if (user.role === 'sales_rep') {
      Object.assign(filter, await this.getSalesRepFilter(user._id));
    }

    if (status && status !== 'all') filter.status = status;
    if (search) {
      const searchConds = [
        { orderId: { $regex: search, $options: 'i' } },
        { patientName: { $regex: search, $options: 'i' } },
      ];
      // If filter already has $or (from sales_rep access), combine via $and
      if (filter.$or) {
        const existingOr = filter.$or;
        delete filter.$or;
        filter.$and = [{ $or: existingOr }, { $or: searchConds }];
      } else {
        filter.$or = searchConds;
      }
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

  async findById(orderId: string, user?: any) {
    const order = await this.orderModel
      .findById(orderId)
      .populate('doctor')
      .populate('product')
      .populate('salesRep', 'firstName lastName email phone')
      .populate('patient', 'firstName lastName email phone address')
      .populate('lineItems.product', 'name sku price')
      .lean();

    if (!order) throw new NotFoundException('Order not found');

    // Access control for sales_rep: can view if they are salesRep OR doctor is in their assignedDoctors
    if (user && user.role === 'sales_rep') {
      const isOwner = order.salesRep?._id?.toString() === user._id.toString();
      if (!isOwner) {
        const fullUser = await this.userModel
          .findById(user._id)
          .select('assignedDoctors')
          .lean();
        const assignedDoctorIds = (fullUser?.assignedDoctors || []).map((id: any) => id.toString());
        const orderDoctorId = (order.doctor as any)?._id?.toString() || (order.doctor as any)?.toString();
        if (!orderDoctorId || !assignedDoctorIds.includes(orderDoctorId)) {
          throw new NotFoundException('Order not found');
        }
      }
    } else if (user && user.role === 'patient') {
      const patientId = (order.patient as any)?._id?.toString() || (order.patient as any)?.toString();
      if (patientId !== user._id.toString()) {
        throw new NotFoundException('Order not found');
      }
    }

    return order;
  }

  async updateStatus(orderId: string, adminId: string, updateDto: UpdateOrderDto) {
    const order = await this.orderModel.findById(orderId);
    if (!order) throw new NotFoundException('Order not found');

    const validTransitions: Record<string, string[]> = {
      submitted: ['approved', 'cancelled'],
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

      // Shipping requires a tracking number (only when transitioning from approved to shipped)
      if (updateDto.status === 'shipped' && order.status === 'approved' && !updateDto.trackingNumber) {
        throw new BadRequestException('Tracking number is required when shipping an order');
      }

      order.status = updateDto.status;
      if (updateDto.rejectionReason) order.rejectionReason = updateDto.rejectionReason;
      if (updateDto.trackingNumber) order.trackingNumber = updateDto.trackingNumber;

      // Update shipped quantities on line items
      if (updateDto.status === 'shipped' && updateDto.shippedItems && updateDto.shippedItems.length > 0) {
        for (const shipped of updateDto.shippedItems) {
          const lineItem = order.lineItems.find(
            (li) => li.product.toString() === shipped.product,
          );
          if (lineItem) {
            lineItem.shippedQuantity = shipped.shippedQuantity;
          }
        }
        order.markModified('lineItems');
      }

      order.statusHistory.push({
        status: updateDto.status,
        changedBy: adminId as any,
        changedAt: new Date(),
        note: updateDto.note || `Status changed to ${updateDto.status}`,
      });

      // Auto-create a shipment record when order is shipped
      if (updateDto.status === 'shipped') {
        await this.shipmentModel.create({
          order: order._id,
          trackingNumber: updateDto.trackingNumber,
          status: 'pending',
          statusHistory: [{ status: 'pending', updatedAt: new Date(), note: 'Shipment created from order approval' }],
        });
      }
    }

    // Allow admin to modify line items on submitted/approved orders
    if (updateDto.lineItems && ['submitted', 'approved'].includes(order.status)) {
      order.lineItems = updateDto.lineItems as any;
      if (updateDto.lineItems.length > 0) {
        order.product = updateDto.lineItems[0].product as any;
        order.quantity = updateDto.lineItems[0].quantity;
      }
      order.markModified('lineItems');
    }

    await order.save();
    return order.populate([
      { path: 'doctor' },
      { path: 'product' },
      { path: 'salesRep', select: 'firstName lastName email phone' },
      { path: 'lineItems.product', model: 'Product' },
    ]);
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
    ).populate([
      { path: 'doctor' },
      { path: 'product' },
      { path: 'salesRep', select: 'firstName lastName email phone' },
      { path: 'lineItems.product', model: 'Product' },
    ]);

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
    if (role === 'patient' && userId) match.patient = new Types.ObjectId(userId);
    if (role === 'sales_rep' && userId) {
      Object.assign(match, await this.getSalesRepFilter(userId));
    }

    const counts = await this.orderModel.aggregate([
      { $match: match },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    const validKeys = new Set(['submitted', 'approved', 'shipped', 'completed', 'cancelled']);
    const result: Record<string, number> = {
      submitted: 0, approved: 0, shipped: 0, completed: 0, cancelled: 0,
    };
    counts.forEach((c) => {
      if (validKeys.has(c._id)) {
        result[c._id] = c.count;
      }
    });
    return result;
  }
}
