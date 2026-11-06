import { Check, Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { moneyTransformer } from '../../common/money';
@Entity('coupons')
@Check(
  'coupon_amount_check',
  `"value" > 0 AND "value" <= 1000000000 AND ("kind" != 'percent' OR "value" <= 100)`,
)
@Check(
  'coupon_limits_check',
  '"usedCount" >= 0 AND "usedCount" <= "maxUses" AND "maxUses" > 0 AND "perUserLimit" > 0',
)
export class Coupon {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ unique: true, length: 32 }) code!: string;
  @Column({ length: 200 }) description!: string;
  @Column({ type: 'varchar', length: 10 }) kind!: 'percent' | 'fixed';
  @Column('integer') value!: number;
  @Column({ type: 'bigint', transformer: moneyTransformer }) minSubtotal!: number;
  @Column({ type: 'bigint', transformer: moneyTransformer }) maxDiscount!: number;
  @Column({ type: 'integer', default: 0 }) usedCount!: number;
  @Column({ type: 'integer', default: 1000 }) maxUses!: number;
  @Column({ type: 'integer', default: 1 }) perUserLimit!: number;
  @Column({ type: 'timestamptz' }) startsAt!: Date;
  @Column({ type: 'timestamptz' }) expiresAt!: Date;
  @Column({ default: true }) isActive!: boolean;
}
