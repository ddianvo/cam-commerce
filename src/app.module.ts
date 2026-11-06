import { AdminModule } from './admin/admin.module';
import { Controller, Get, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { validateEnv } from './config/env';
import { databaseOptions } from './database/data-source';
import { AuthModule } from './auth/auth.module';
import { Public } from './auth/auth.decorators';
import { ProductModule } from './products/product.module';
import { CartModule } from './cart/cart.module';
import { OrderModule } from './orders/order.module';
import { CouponModule } from './coupons/coupon.module';
import { AiModule } from './ai/ai.module';
@Controller('health')
class HealthController {
  @Public() @Get() get() {
    return { status: 'ok' };
  }
}
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (c: ConfigService) => databaseOptions(c.getOrThrow<string>('DATABASE_URL')),
    }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    AuthModule,
    ProductModule,
    CartModule,
    OrderModule,
    CouponModule,
    AiModule,
    AdminModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
