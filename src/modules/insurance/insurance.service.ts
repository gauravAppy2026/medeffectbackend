import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { IVRRequest, IVRRequestDocument } from './schemas/ivr-request.schema';
import { CreateIVRDto } from './dto/create-ivr.dto';
import { UpdateIVRDto } from './dto/update-ivr.dto';

@Injectable()
export class InsuranceService {
  constructor(@InjectModel(IVRRequest.name) private ivrModel: Model<IVRRequestDocument>) {}

  async create(userId: string, createDto: CreateIVRDto) {
    const count = await this.ivrModel.countDocuments();
    const requestId = `IVR-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    const ivr = await this.ivrModel.create({
      ...createDto,
      requestId,
      submittedBy: userId,
      status: 'pending',
    });

    return ivr;
  }

  async findAll(user: any, query: any) {
    const { page = 1, limit = 20, status, search } = query;
    const filter: any = {};

    if (user.role !== 'admin') {
      filter.submittedBy = user._id;
    }

    if (status && status !== 'all') filter.status = status;
    if (search) {
      filter.$or = [
        { requestId: { $regex: search, $options: 'i' } },
        { 'patient.firstName': { $regex: search, $options: 'i' } },
        { 'patient.lastName': { $regex: search, $options: 'i' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.ivrModel
        .find(filter)
        .populate('submittedBy', 'firstName lastName email')
        .populate('reviewedBy', 'firstName lastName')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      this.ivrModel.countDocuments(filter),
    ]);

    return { data, total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / limit) };
  }

  async findById(id: string) {
    const ivr = await this.ivrModel
      .findById(id)
      .populate('submittedBy', 'firstName lastName email')
      .populate('reviewedBy', 'firstName lastName')
      .lean();
    if (!ivr) throw new NotFoundException('IVR request not found');
    return ivr;
  }

  async update(id: string, adminId: string, updateDto: UpdateIVRDto) {
    const ivr = await this.ivrModel.findByIdAndUpdate(
      id,
      {
        status: updateDto.status,
        reviewedBy: adminId,
        reviewedAt: new Date(),
        ...(updateDto.approvalDocument && { approvalDocument: updateDto.approvalDocument }),
      },
      { new: true },
    );
    if (!ivr) throw new NotFoundException('IVR request not found');
    return ivr;
  }

  async getStatusCounts(userId?: string, role?: string) {
    const match: any = {};
    if (role === 'patient') match.submittedBy = userId;

    const counts = await this.ivrModel.aggregate([
      { $match: match },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    const result: Record<string, number> = { pending: 0, approved: 0, rejected: 0 };
    counts.forEach((c) => { result[c._id] = c.count; });
    return result;
  }
}
