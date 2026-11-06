import {
  Check,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Product } from '../../products/entities/product.entity';
@Entity('cart_items')
@Unique('cart_user_product_unique', ['userId', 'productId'])
@Check('cart_quantity_check', '"quantity" > 0 AND "quantity" <= 1000')
export class CartItem {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column('uuid') userId!: string;
  @ManyToOne(() => User, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'userId' }) user!: User;
  @Column('uuid') productId!: string;
  @ManyToOne(() => Product, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'productId' })
  product!: Product;
  @Column('integer') quantity!: number;
}
