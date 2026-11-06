import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { moneyTransformer } from '../../common/money';
@Entity('products')
@Check('products_price_check', '"price" >= 0 AND "price" <= 1000000000')
@Check('products_stock_check', '"stock" >= 0 AND "stock" <= 1000000000')
export class Product {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ length: 200 }) name!: string;
  @Column({ type: 'varchar', length: 200, nullable: true }) imageUrl!: string | null;
  @Column({ type: 'text' }) description!: string;
  // PostgreSQL bigint + transformer; VND, capped below JS MAX_SAFE_INTEGER.
  @Column({ type: 'bigint', transformer: moneyTransformer }) price!: number;
  @Column({ type: 'integer', default: 0 }) stock!: number;
  @Index() @Column({ length: 100 }) category!: string;
  @Column({ type: 'text', array: true, default: () => "'{}'" }) tags!: string[];
  // Prepared by service; unaccented Vietnamese allows 'giay' to match 'giày'.
  @Column({ type: 'text', select: false }) searchText!: string;
  @Index() @Column({ default: true }) isActive!: boolean;
  @CreateDateColumn({ type: 'timestamptz' }) createdAt!: Date;
  @UpdateDateColumn({ type: 'timestamptz' }) updatedAt!: Date;
}
