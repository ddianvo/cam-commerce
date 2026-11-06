import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Product } from '../products/entities/product.entity';
import { CartItem } from './entities/cart-item.entity';
import { SetCartItemDto } from './dto/cart.dto';
import { checkedTotal } from '../common/money';
@Injectable()
export class CartService {
  constructor(private readonly db: DataSource) {}
  async get(userId: string) {
    const items = await this.db
      .getRepository(CartItem)
      .find({ where: { userId }, relations: { product: true }, order: { id: 'ASC' } });
    return {
      items,
      total: checkedTotal(items.map((i) => ({ unitPrice: i.product.price, quantity: i.quantity }))),
      currency: 'VND',
    };
  }
  async set(userId: string, dto: SetCartItemDto) {
    await this.db.transaction(async (em) => {
      // All cart mutations and checkout take the same user row lock first.
      await em.findOneOrFail(User, { where: { id: userId }, lock: { mode: 'pessimistic_write' } });
      const product = await em.findOneBy(Product, { id: dto.productId, isActive: true });
      if (!product) throw new NotFoundException('Không tìm thấy sản phẩm');
      if (product.stock < dto.quantity) throw new BadRequestException('Không đủ tồn kho');
      const existing = await em.findOneBy(CartItem, { userId, productId: dto.productId });
      if (!existing && (await em.countBy(CartItem, { userId })) >= 50)
        throw new BadRequestException('Giỏ hàng tối đa 50 sản phẩm');
      await em.save(
        CartItem,
        em.create(CartItem, {
          id: existing?.id,
          userId,
          productId: dto.productId,
          quantity: dto.quantity,
        }),
      );
    });
    return this.get(userId);
  }
  async remove(userId: string, productId: string) {
    await this.db.transaction(async (em) => {
      await em.findOneOrFail(User, { where: { id: userId }, lock: { mode: 'pessimistic_write' } });
      await em.delete(CartItem, { userId, productId });
    });
    return this.get(userId);
  }
}
