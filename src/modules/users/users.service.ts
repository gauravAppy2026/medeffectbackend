import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { User, UserDocument } from './schemas/user.schema';
import { Order, OrderDocument } from '../orders/schemas/order.schema';
import { IVRRequest, IVRRequestDocument } from '../insurance/schemas/ivr-request.schema';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(IVRRequest.name) private ivrModel: Model<IVRRequestDocument>,
  ) {}

  async getProfile(userId: string) {
    const user = await this.userModel.findById(userId).select('-password -refreshToken').lean();
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateProfile(userId: string, updateDto: UpdateProfileDto) {
    const user = await this.userModel
      .findByIdAndUpdate(userId, { $set: updateDto }, { new: true })
      .select('-password -refreshToken')
      .lean();
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async listUsers(query: PaginationDto & { role?: string }) {
    const { page = 1, limit = 20, search, role } = query;
    const filter: any = {};

    if (role) filter.role = role;
    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.userModel
        .find(filter)
        .select('-password -refreshToken')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      this.userModel.countDocuments(filter),
    ]);

    // For sales_rep role, aggregate stats (orders, IVR requests, practitioners)
    if (role === 'sales_rep' && data.length > 0) {
      const userIds = data.map((u) => u._id);

      const [orderCounts, ivrCounts, practitionerCounts] = await Promise.all([
        this.orderModel.aggregate([
          { $match: { salesRep: { $in: userIds } } },
          { $group: { _id: '$salesRep', count: { $sum: 1 } } },
        ]),
        this.ivrModel.aggregate([
          { $match: { submittedBy: { $in: userIds } } },
          { $group: { _id: '$submittedBy', count: { $sum: 1 } } },
        ]),
        this.orderModel.aggregate([
          { $match: { salesRep: { $in: userIds } } },
          { $group: { _id: { salesRep: '$salesRep', doctor: '$doctor' } } },
          { $group: { _id: '$_id.salesRep', count: { $sum: 1 } } },
        ]),
      ]);

      const orderMap = Object.fromEntries(orderCounts.map((c) => [String(c._id), c.count]));
      const ivrMap = Object.fromEntries(ivrCounts.map((c) => [String(c._id), c.count]));
      const practMap = Object.fromEntries(practitionerCounts.map((c) => [String(c._id), c.count]));

      for (const user of data as any[]) {
        const uid = String(user._id);
        user.orderCount = orderMap[uid] || 0;
        user.ivrCount = ivrMap[uid] || 0;
        user.practitionerCount = practMap[uid] || 0;
      }
    }

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async createUser(createDto: CreateUserDto) {
    const existing = await this.userModel.findOne({ email: createDto.email.toLowerCase() });
    if (existing) throw new ConflictException('Email already registered');

    // HIPAA: Use 12 bcrypt rounds for stronger password hashing
    const hashedPassword = await bcrypt.hash(createDto.password, 12);

    const { address, city, state, zipCode, dob, assignedDoctors, ...rest } = createDto;

    const userData: any = {
      ...rest,
      email: createDto.email.toLowerCase(),
      password: hashedPassword,
    };

    if (address || city || state || zipCode) {
      userData.address = { street: address, city, state, zipCode };
    }

    if (dob) {
      userData.dateOfBirth = new Date(dob);
    }

    if (assignedDoctors && assignedDoctors.length > 0) {
      userData.assignedDoctors = assignedDoctors;
    }

    const user = await this.userModel.create(userData);

    const { password, refreshToken, ...result } = user.toObject();
    return result;
  }

  async getUserById(id: string) {
    const user = await this.userModel
      .findById(id)
      .select('-password -refreshToken')
      .lean();
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateUser(id: string, updateDto: UpdateUserDto) {
    const existing = await this.userModel.findById(id);
    if (!existing) throw new NotFoundException('User not found');

    const { address, city, state, zipCode, dob, password, email, assignedDoctors, ...rest } = updateDto;

    const updateData: any = { ...rest };

    if (email) {
      const lowercased = email.toLowerCase();
      if (lowercased !== existing.email) {
        const conflict = await this.userModel.findOne({ email: lowercased, _id: { $ne: id } });
        if (conflict) throw new ConflictException('Email already registered');
        updateData.email = lowercased;
      }
    }

    if (password) {
      updateData.password = await bcrypt.hash(password, 12);
    }

    if (address !== undefined || city !== undefined || state !== undefined || zipCode !== undefined) {
      updateData.address = {
        street: address ?? existing.address?.street ?? '',
        city: city ?? existing.address?.city ?? '',
        state: state ?? existing.address?.state ?? '',
        zipCode: zipCode ?? existing.address?.zipCode ?? '',
      };
    }

    if (dob !== undefined) {
      updateData.dateOfBirth = dob ? new Date(dob) : null;
    }

    if (assignedDoctors !== undefined) {
      updateData.assignedDoctors = assignedDoctors;
    }

    const updated = await this.userModel
      .findByIdAndUpdate(id, { $set: updateData }, { new: true })
      .select('-password -refreshToken')
      .lean();
    return updated;
  }
}
