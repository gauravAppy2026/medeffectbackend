import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { APP_INTERCEPTOR, APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { OrdersModule } from './modules/orders/orders.module';
import { InsuranceModule } from './modules/insurance/insurance.module';
import { DoctorsModule } from './modules/doctors/doctors.module';
import { ProductsModule } from './modules/products/products.module';
import { ShipmentsModule } from './modules/shipments/shipments.module';
import { ReportsModule } from './modules/reports/reports.module';
import { UploadModule } from './modules/upload/upload.module';
import { CmsModule } from './modules/cms/cms.module';
import { AuditModule } from './modules/audit/audit.module';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRoot(process.env.MONGODB_URI || 'mongodb://localhost:27017/medeffects'),
    // HIPAA: Global rate limiting to prevent brute-force attacks
    ThrottlerModule.forRoot([{
      ttl: parseInt(process.env.THROTTLE_TTL || '60', 10) * 1000,
      limit: parseInt(process.env.THROTTLE_LIMIT || '100', 10),
    }]),
    AuditModule,
    AuthModule,
    UsersModule,
    OrdersModule,
    InsuranceModule,
    DoctorsModule,
    ProductsModule,
    ShipmentsModule,
    ReportsModule,
    UploadModule,
    CmsModule,
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
    // HIPAA: Enable rate limiting globally
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
