import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Put } from '@nestjs/common';
import { CurrentUser, Principal } from '../auth/auth.decorators';
import { CartService } from './cart.service';
import { SetCartItemDto } from './dto/cart.dto';
@Controller('cart')
export class CartController {
  constructor(private readonly cart: CartService) {}
  @Get() get(@CurrentUser() u: Principal) {
    return this.cart.get(u.id);
  }
  @Put('items') set(@CurrentUser() u: Principal, @Body() dto: SetCartItemDto) {
    return this.cart.set(u.id, dto);
  }
  @Delete('items/:productId') remove(
    @CurrentUser() u: Principal,
    @Param('productId', ParseUUIDPipe) id: string,
  ) {
    return this.cart.remove(u.id, id);
  }
}
