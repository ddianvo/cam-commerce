import { OrderManagementQueryDto } from './dto/order.dto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { CartItem } from '../cart/entities/cart-item.entity';
import { Product } from '../products/entities/product.entity';
import { checkedTotal } from '../common/money';
import { CouponService } from '../coupons/coupon.service';
import { Coupon } from '../coupons/entities/coupon.entity';
import { Order, OrderItem, OrderStatus } from './entities/order.entity';
@Injectable()
export class OrderService {
  constructor(
    private readonly db: DataSource,
    private readonly coupons: CouponService,
  ) {}
  async checkout(userId: string, idempotencyKey: string, couponCode?: string): Promise<Order> {
    return this.db.transaction('READ COMMITTED', async (em) => {
      await em.findOneOrFail(User, { where: { id: userId }, lock: { mode: 'pessimistic_write' } });
      const previous = await em.findOne(Order, {
        where: { userId, idempotencyKey },
        relations: { items: true },
      });
      if (previous) return previous;
      const cart = await em.find(CartItem, { where: { userId }, order: { productId: 'ASC' } });
      if (!cart.length) throw new BadRequestException('Giỏ hàng trống');
      const items: OrderItem[] = [];
      // Deterministic product lock ordering prevents cross-cart deadlocks.
      for (const line of cart) {
        const product = await em.findOne(Product, {
          where: { id: line.productId },
          lock: { mode: 'pessimistic_write' },
        });
        if (!product?.isActive || product.stock < line.quantity)
          throw new ConflictException('Sản phẩm không còn đủ tồn kho: ' + line.productId);
        items.push(
          em.create(OrderItem, {
            productId: product.id,
            productName: product.name,
            unitPrice: product.price,
            quantity: line.quantity,
          }),
        );
        await em.decrement(Product, { id: product.id }, 'stock', line.quantity);
      }
      const subtotal = checkedTotal(items);
      // User lock precedes coupon lock. The coupon row serializes the last available redemption.
      const quote = couponCode
        ? await this.coupons.quote(userId, couponCode, subtotal, em, true)
        : null;
      const discount = quote?.discount ?? 0;
      const total = subtotal - discount;
      if (quote) await em.increment(Coupon, { id: quote.coupon.id }, 'usedCount', 1);
      const order = await em.save(
        Order,
        em.create(Order, {
          userId,
          idempotencyKey,
          total,
          subtotal,
          discount,
          couponCode: quote?.coupon.code ?? null,
          currency: 'VND',
          status: OrderStatus.CONFIRMED,
          items,
        }),
      );
      await em.delete(CartItem, { userId });
      return order;
    });
  }
  async manage(query: OrderManagementQueryDto) {
    const qb = this.db
      .getRepository(Order)
      .createQueryBuilder('o')
      .leftJoinAndSelect('o.items', 'items')
      .leftJoin('o.user', 'buyer')
      .addSelect(['buyer.id', 'buyer.email']);
    if (query.status) qb.andWhere('o.status = :status', { status: query.status });
    if (query.q?.trim())
      qb.andWhere('(CAST(o.id AS TEXT) ILIKE :q OR buyer.email ILIKE :q)', {
        q: '%' + query.q.trim() + '%',
      });
    const [rows, total] = await qb
      .orderBy('o.createdAt', 'DESC')
      .addOrderBy('o.id', 'ASC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getManyAndCount();
    return {
      items: rows.map(({ user, ...order }) => ({
        ...order,
        customer: { id: user.id, email: user.email },
      })),
      total,
      page: query.page,
      limit: query.limit,
    };
  }
  list(userId?: string) {
    return this.db.getRepository(Order).find({
      where: userId ? { userId } : {},
      relations: { items: true },
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }
  async get(id: string, userId?: string) {
    const order = await this.db
      .getRepository(Order)
      .findOne({ where: { id, ...(userId ? { userId } : {}) }, relations: { items: true } });
    if (!order) throw new NotFoundException('Không tìm thấy đơn hàng');
    return order;
  }
  async updateStatus(id: string, status: OrderStatus) {
    return this.db.transaction(async (em) => {
      const order = await em.findOne(Order, { where: { id }, lock: { mode: 'pessimistic_write' } });
      if (!order) throw new NotFoundException('Không tìm thấy đơn hàng');
      const next: Partial<Record<OrderStatus, OrderStatus>> = {
        confirmed: OrderStatus.SHIPPED,
        shipped: OrderStatus.DELIVERED,
      };
      if (status !== order.status && next[order.status] !== status)
        throw new ConflictException('Chuyển trạng thái đơn hàng không hợp lệ');
      order.status = status;
      return em.save(order);
    });
  }
}
