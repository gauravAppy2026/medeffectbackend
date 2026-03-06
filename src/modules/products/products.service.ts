import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Product, ProductDocument } from './schemas/product.schema';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(@InjectModel(Product.name) private productModel: Model<ProductDocument>) {}

  async findAll(query: any) {
    const { page = 1, limit = 20, search } = query;
    const filter: any = {};

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.productModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      this.productModel.countDocuments(filter),
    ]);

    return { data, total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / limit) };
  }

  async findActive() {
    return this.productModel
      .find({ isActive: true })
      .select('name sku category price stock')
      .sort({ name: 1 })
      .lean();
  }

  async create(createDto: CreateProductDto) {
    const existing = await this.productModel.findOne({ sku: createDto.sku });
    if (existing) throw new ConflictException('SKU already exists');
    return this.productModel.create(createDto);
  }

  async update(id: string, updateDto: UpdateProductDto) {
    const product = await this.productModel.findByIdAndUpdate(id, { $set: updateDto }, { new: true });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async delete(id: string) {
    const product = await this.productModel.findByIdAndUpdate(id, { isActive: false }, { new: true });
    if (!product) throw new NotFoundException('Product not found');
    return { message: 'Product deactivated' };
  }
}
