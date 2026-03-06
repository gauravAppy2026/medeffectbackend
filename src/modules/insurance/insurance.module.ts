import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { InsuranceController } from './insurance.controller';
import { InsuranceService } from './insurance.service';
import { IVRRequest, IVRRequestSchema } from './schemas/ivr-request.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: IVRRequest.name, schema: IVRRequestSchema }])],
  controllers: [InsuranceController],
  providers: [InsuranceService],
  exports: [InsuranceService],
})
export class InsuranceModule {}
