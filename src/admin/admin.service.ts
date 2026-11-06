import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Product } from '../products/entities/product.entity';
import { Order, OrderStatus } from '../orders/entities/order.entity';
@Injectable()
export class AdminService {
  constructor(private readonly db: DataSource) {}
  async overview() {
    const products = this.db.getRepository(Product),
      orders = this.db.getRepository(Order);
    const [
      totalProducts,
      activeProducts,
      lowStock,
      totalOrders,
      confirmed,
      shipped,
      delivered,
      value,
    ] = await Promise.all([
      products.count(),
      products.countBy({ isActive: true }),
      products.createQueryBuilder('p').where('p.isActive = true AND p.stock <= 5').getCount(),
      orders.count(),
      orders.countBy({ status: OrderStatus.CONFIRMED }),
      orders.countBy({ status: OrderStatus.SHIPPED }),
      orders.countBy({ status: OrderStatus.DELIVERED }),
      orders
        .createQueryBuilder('o')
        .select('COALESCE(SUM(o.total),0)', 'value')
        .getRawOne<{ value: string }>(),
    ]);
    return {
      totalProducts,
      activeProducts,
      inactiveProducts: totalProducts - activeProducts,
      lowStock,
      totalOrders,
      confirmed,
      shipped,
      delivered,
      orderValue: String(value?.value ?? '0'),
    };
  }
}
