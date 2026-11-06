import { MigrationInterface, QueryRunner } from 'typeorm';
export class Coupons1762400000000 implements MigrationInterface {
  name = 'Coupons1762400000000';
  async up(q: QueryRunner) {
    await q.query(
      `CREATE TABLE coupons (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), code varchar(32) NOT NULL UNIQUE, description varchar(200) NOT NULL, kind varchar(10) NOT NULL CHECK (kind IN ('percent','fixed')), value integer NOT NULL, "minSubtotal" bigint NOT NULL CHECK ("minSubtotal" >= 0), "maxDiscount" bigint NOT NULL CHECK ("maxDiscount" >= 0), "usedCount" integer NOT NULL DEFAULT 0, "maxUses" integer NOT NULL DEFAULT 1000, "perUserLimit" integer NOT NULL DEFAULT 1, "startsAt" timestamptz NOT NULL, "expiresAt" timestamptz NOT NULL, "isActive" boolean NOT NULL DEFAULT true, CONSTRAINT coupon_amount_check CHECK (value > 0 AND value <= 1000000000 AND (kind != 'percent' OR value <= 100)), CONSTRAINT coupon_limits_check CHECK ("usedCount" >= 0 AND "usedCount" <= "maxUses" AND "maxUses" > 0 AND "perUserLimit" > 0), CHECK ("expiresAt" > "startsAt"))`,
    );
    await q.query(
      `ALTER TABLE orders ADD COLUMN subtotal bigint NOT NULL DEFAULT 0, ADD COLUMN discount bigint NOT NULL DEFAULT 0, ADD COLUMN "couponCode" varchar(32)`,
    );
    await q.query('UPDATE orders SET subtotal = total');
    await q.query(
      `ALTER TABLE orders ADD CONSTRAINT orders_discount_check CHECK (subtotal >= 0 AND discount >= 0 AND discount <= subtotal AND total = subtotal - discount)`,
    );
    await q.query('CREATE INDEX orders_coupon_user_idx ON orders ("couponCode", "userId")');
  }
  async down(q: QueryRunner) {
    await q.query('DROP INDEX orders_coupon_user_idx');
    await q.query(
      'ALTER TABLE orders DROP CONSTRAINT orders_discount_check, DROP COLUMN subtotal, DROP COLUMN discount, DROP COLUMN "couponCode"',
    );
    await q.query('DROP TABLE coupons');
  }
}
