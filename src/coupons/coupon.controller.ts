import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { CurrentUser, Principal, Public } from '../auth/auth.decorators';
import { CouponService } from './coupon.service';
import { CouponCodeDto } from './dto/coupon.dto';
@Controller('coupons')
export class CouponController {
  constructor(private readonly coupons: CouponService) {}
  @Public() @Get() list() {
    return this.coupons.list();
  }
  @Post('preview') @HttpCode(200) preview(
    @CurrentUser() user: Principal,
    @Body() dto: CouponCodeDto,
  ) {
    return this.coupons.preview(user.id, dto.code);
  }
}
