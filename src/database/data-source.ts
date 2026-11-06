import { ProductImages1762480000000 } from './migrations/1762480000000-product-images';
import 'reflect-metadata';
import 'dotenv/config';
import { DataSource, DataSourceOptions } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Product } from '../products/entities/product.entity';
import { CartItem } from '../cart/entities/cart-item.entity';
import { Order, OrderItem } from '../orders/entities/order.entity';
import { InitialSchema1760000000000 } from './migrations/1760000000000-initial-schema';
import { Coupon } from '../coupons/entities/coupon.entity';
import { Coupons1762400000000 } from './migrations/1762400000000-coupons';
export function databaseOptions(url: string): DataSourceOptions {
  return {
    type: 'postgres',
    uuidExtension: 'pgcrypto',
    url,
    entities: [User, Product, CartItem, Order, OrderItem, Coupon],
    migrations: [InitialSchema1760000000000, Coupons1762400000000, ProductImages1762480000000],
    synchronize: false,
    migrationsRun: false,
    logging: false,
    extra: { max: 10, connectionTimeoutMillis: 5000, statement_timeout: 15000 },
  };
}
export default new DataSource(
  databaseOptions(
    process.env.DATABASE_URL ?? 'postgresql://commerce:commerce_dev@localhost:5432/commerce',
  ),
);
