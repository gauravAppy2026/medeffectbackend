import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Shipment, ShipmentDocument } from './schemas/shipment.schema';
import { Order, OrderDocument } from '../orders/schemas/order.schema';
import { CreateShipmentDto } from './dto/create-shipment.dto';
import { UpdateShipmentDto } from './dto/update-shipment.dto';

@Injectable()
export class ShipmentsService {
  constructor(
    @InjectModel(Shipment.name) private shipmentModel: Model<ShipmentDocument>,
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
  ) {}

  async findAll(query: any) {
    const { page = 1, limit = 20, search, status } = query;
    const filter: any = {};

    if (status && status !== 'all') filter.status = status;
    if (search) {
      filter.$or = [
        { trackingNumber: { $regex: search, $options: 'i' } },
        { carrier: { $regex: search, $options: 'i' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.shipmentModel
        .find(filter)
        .populate({
          path: 'order',
          select: 'orderId patientName status',
          populate: { path: 'patient', select: 'firstName lastName' },
        })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      this.shipmentModel.countDocuments(filter),
    ]);

    return { data, total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / limit) };
  }

  async create(createDto: CreateShipmentDto, userId?: string) {
    // Support both MongoDB ObjectId and formatted orderId (e.g. "ORD-2026-0007")
    let order: OrderDocument | null = null;
    const orderRef = createDto.order;
    if (orderRef.match(/^[0-9a-fA-F]{24}$/)) {
      order = await this.orderModel.findById(orderRef);
    }
    if (!order) {
      order = await this.orderModel.findOne({ orderId: orderRef });
    }
    if (!order) throw new NotFoundException('Order not found');

    const shipment = await this.shipmentModel.create({
      order: order._id,
      trackingNumber: createDto.trackingNumber,
      carrier: createDto.carrier,
      estimatedDelivery: createDto.estimatedDelivery,
      status: 'pending',
      statusHistory: [{ status: 'pending', updatedAt: new Date(), note: 'Shipment created' }],
    });

    order.trackingNumber = createDto.trackingNumber;
    if (order.status === 'approved') {
      order.status = 'shipped';
      order.statusHistory.push({
        status: 'shipped',
        changedBy: userId ? new Types.ObjectId(userId) : (null as any),
        changedAt: new Date(),
        note: `Tracking: ${createDto.trackingNumber}`,
      });
    }
    await order.save();

    return shipment;
  }

  async update(id: string, updateDto: UpdateShipmentDto, userId?: string) {
    const shipment = await this.shipmentModel.findById(id);
    if (!shipment) throw new NotFoundException('Shipment not found');

    if (updateDto.status) {
      shipment.status = updateDto.status;
      shipment.statusHistory.push({
        status: updateDto.status,
        updatedAt: new Date(),
        note: updateDto.note || `Status changed to ${updateDto.status}`,
      });

      // Sync shipment status back to the linked order
      const orderStatusMap: Record<string, string> = {
        completed: 'completed',
      };
      const newOrderStatus = orderStatusMap[updateDto.status];
      if (newOrderStatus) {
        const order = await this.orderModel.findById(shipment.order);
        if (order && order.status !== 'cancelled') {
          order.status = newOrderStatus;
          order.statusHistory.push({
            status: newOrderStatus,
            changedBy: userId ? new Types.ObjectId(userId) : (null as any),
            changedAt: new Date(),
            note: updateDto.note || `Updated from shipment: ${updateDto.status}`,
          });
          await order.save();
        }
      }
    }

    if (updateDto.trackingNumber) shipment.trackingNumber = updateDto.trackingNumber;
    if (updateDto.carrier) shipment.carrier = updateDto.carrier;

    await shipment.save();
    return shipment;
  }
}
