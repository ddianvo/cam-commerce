import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { moneyTransformer } from '../../common/money';
export enum OrderStatus {
  CONFIRMED = 'confirmed',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
}
@Entity('orders')
@Unique('orders_idempotency_unique', ['userId', 'idempotencyKey'])
@Check('orders_total_check', '"total" >= 0 AND "total" <= 1000000000000')
export class Order {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column('uuid') userId!: string;
  @ManyToOne(() => User, { onDelete: 'RESTRICT' }) @JoinColumn({ name: 'userId' }) user!: User;
  @Column('uuid') idempotencyKey!: string;
  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.CONFIRMED }) status!: OrderStatus;
  @Column({ type: 'bigint', transformer: moneyTransformer }) total!: number;
  @Column({ type: 'bigint', transformer: moneyTransformer, default: 0 }) subtotal!: number;
  @Column({ type: 'bigint', transformer: moneyTransformer, default: 0 }) discount!: number;
  @Column({ type: 'varchar', length: 32, nullable: true }) couponCode!: string | null;
  @Column({ default: 'VND' }) currency!: string;
  @OneToMany(() => OrderItem, (item) => item.order, { cascade: ['insert'] }) items!: OrderItem[];
  @CreateDateColumn({ type: 'timestamptz' }) createdAt!: Date;
}
@Entity('order_items')
@Check('order_items_quantity_check', '"quantity" > 0 AND "quantity" <= 1000')
@Check('order_items_price_check', '"unitPrice" >= 0 AND "unitPrice" <= 1000000000')
export class OrderItem {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column('uuid') orderId!: string;
  @ManyToOne(() => Order, (order) => order.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orderId' })
  order!: Order;
  // Snapshot preserves historical name/price even if the catalog changes.
  @Column('uuid') productId!: string;
  @Column() productName!: string;
  @Column({ type: 'bigint', transformer: moneyTransformer }) unitPrice!: number;
  @Column('integer') quantity!: number;
}
