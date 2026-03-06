import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Doctor, DoctorDocument } from './schemas/doctor.schema';
import { CreateDoctorDto } from './dto/create-doctor.dto';
import { UpdateDoctorDto } from './dto/update-doctor.dto';

@Injectable()
export class DoctorsService {
  constructor(@InjectModel(Doctor.name) private doctorModel: Model<DoctorDocument>) {}

  async findAll(query: any) {
    const { page = 1, limit = 20, search } = query;
    const filter: any = { isActive: { $ne: false } };

    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { department: { $regex: search, $options: 'i' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.doctorModel
        .find(filter)
        .populate('assignedSalesRep', 'firstName lastName email')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      this.doctorModel.countDocuments(filter),
    ]);

    return { data, total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / limit) };
  }

  async findActive() {
    return this.doctorModel
      .find({ isActive: true })
      .select('firstName lastName department')
      .sort({ firstName: 1 })
      .lean();
  }

  async create(createDto: CreateDoctorDto) {
    return this.doctorModel.create(createDto);
  }

  async update(id: string, updateDto: UpdateDoctorDto) {
    const doctor = await this.doctorModel.findByIdAndUpdate(id, { $set: updateDto }, { new: true });
    if (!doctor) throw new NotFoundException('Doctor not found');
    return doctor;
  }

  async delete(id: string) {
    const doctor = await this.doctorModel.findByIdAndUpdate(id, { isActive: false }, { new: true });
    if (!doctor) throw new NotFoundException('Doctor not found');
    return { message: 'Doctor deactivated' };
  }
}
