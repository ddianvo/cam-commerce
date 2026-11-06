import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { CurrentUser, Principal, Roles } from '../auth/auth.decorators';
import { Role } from '../users/entities/user.entity';
import { CheckoutDto, OrderManagementQueryDto, UpdateOrderStatusDto } from './dto/order.dto';
import { OrderService } from './order.service';
@Controller('orders')
export class OrderController {
  constructor(private readonly orders: OrderService) {}
  @Post('checkout') checkout(@CurrentUser() u: Principal, @Body() dto: CheckoutDto) {
    return this.orders.checkout(u.id, dto.idempotencyKey, dto.couponCode);
  }
  @Get() list(@CurrentUser() u: Principal) {
    return this.orders.list(u.role === Role.CUSTOMER ? u.id : undefined);
  }
  @Get('manage')
  @Roles(Role.ADMIN, Role.STAFF)
  manage(@Query() query: OrderManagementQueryDto) {
    return this.orders.manage(query);
  }
  @Get(':id') get(@CurrentUser() u: Principal, @Param('id', ParseUUIDPipe) id: string) {
    return this.orders.get(id, u.role === Role.CUSTOMER ? u.id : undefined);
  }
  @Patch(':id/status')
  @Roles(Role.ADMIN, Role.STAFF)
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateOrderStatusDto) {
    return this.orders.updateStatus(id, dto.status);
  }
}
