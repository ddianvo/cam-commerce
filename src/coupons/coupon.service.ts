import { BadRequestException, Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { Coupon } from './entities/coupon.entity';
import { Order } from '../orders/entities/order.entity';
import { CartItem } from '../cart/entities/cart-item.entity';
import { checkedTotal } from '../common/money';
import { calculateDiscount } from './discount';
@Injectable()
export class CouponService {
  constructor(private readonly db: DataSource) {}
  list() {
    return this.db
      .getRepository(Coupon)
      .createQueryBuilder('c')
      .where('c.isActive = true')
      .andWhere('c.startsAt <= CURRENT_TIMESTAMP')
      .andWhere('c.expiresAt > CURRENT_TIMESTAMP')
      .andWhere('c.usedCount < c.maxUses')
      .orderBy('c.minSubtotal', 'ASC')
      .take(20)
      .getMany();
  }
  async quote(userId: string, code: string, subtotal: number, em: EntityManager, lock = false) {
    const coupon = await em.findOne(Coupon, {
      where: { code: code.trim().toUpperCase() },
      ...(lock ? { lock: { mode: 'pessimistic_write' as const } } : {}),
    });
    if (!coupon || !coupon.isActive)
      throw new BadRequestException('Mã giảm giá không hợp lệ hoặc đã ngừng áp dụng');
    const now = Date.now();
    if (coupon.startsAt.getTime() > now)
      throw new BadRequestException('Mã giảm giá chưa đến thời gian áp dụng');
    if (coupon.expiresAt.getTime() <= now) throw new BadRequestException('Mã giảm giá đã hết hạn');
    if (coupon.usedCount >= coupon.maxUses)
      throw new BadRequestException('Mã giảm giá đã hết lượt sử dụng');
    if (subtotal < coupon.minSubtotal)
      throw new BadRequestException(
        'Đơn hàng chưa đạt giá trị tối thiểu ' + coupon.minSubtotal.toLocaleString('vi-VN') + 'đ',
      );
    if ((await em.countBy(Order, { userId, couponCode: coupon.code })) >= coupon.perUserLimit)
      throw new BadRequestException('Bạn đã dùng hết lượt của mã giảm giá này');
    const discount = calculateDiscount(subtotal, coupon);
    return { coupon, subtotal, discount, total: subtotal - discount };
  }
  async preview(userId: string, code: string) {
    const items = await this.db
      .getRepository(CartItem)
      .find({ where: { userId }, relations: { product: true } });
    if (!items.length) throw new BadRequestException('Thêm sản phẩm vào giỏ trước khi áp mã');
    const subtotal = checkedTotal(
      items.map((i) => ({ unitPrice: i.product.price, quantity: i.quantity })),
    );
    const result = await this.quote(userId, code, subtotal, this.db.manager);
    return {
      code: result.coupon.code,
      description: result.coupon.description,
      subtotal,
      discount: result.discount,
      total: result.total,
      currency: 'VND',
    };
  }
}
