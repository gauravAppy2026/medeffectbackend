import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller()
@UseGuards(JwtAuthGuard)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get('products')
  async findActive() {
    return this.productsService.findActive();
  }

  @Get('admin/products')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async findAll(@Query() query: any) {
    return this.productsService.findAll(query);
  }

  @Post('admin/products')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async create(@Body() createDto: CreateProductDto) {
    return this.productsService.create(createDto);
  }

  @Put('admin/products/:id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async update(@Param('id') id: string, @Body() updateDto: UpdateProductDto) {
    return this.productsService.update(id, updateDto);
  }

  @Delete('admin/products/:id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async delete(@Param('id') id: string) {
    return this.productsService.delete(id);
  }
}
