import { MigrationInterface, QueryRunner } from 'typeorm';
export class InitialSchema1760000000000 implements MigrationInterface {
  name = 'InitialSchema1760000000000';
  async up(q: QueryRunner): Promise<void> {
    await q.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);
    await q.query("CREATE TYPE users_role_enum AS ENUM ('admin', 'staff', 'customer')");
    await q.query("CREATE TYPE orders_status_enum AS ENUM ('confirmed', 'shipped', 'delivered')");
    await q.query(
      `CREATE TABLE users (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), email varchar NOT NULL UNIQUE, "passwordHash" varchar NOT NULL, role users_role_enum NOT NULL DEFAULT 'customer', "tokenVersion" integer NOT NULL DEFAULT 0, "createdAt" timestamptz NOT NULL DEFAULT now())`,
    );
    await q.query(
      `CREATE TABLE products (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name varchar(200) NOT NULL, description text NOT NULL, price bigint NOT NULL, stock integer NOT NULL DEFAULT 0, category varchar(100) NOT NULL, tags text[] NOT NULL DEFAULT '{}', "searchText" text NOT NULL, "isActive" boolean NOT NULL DEFAULT true, "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(), CONSTRAINT products_price_check CHECK (price >= 0 AND price <= 1000000000), CONSTRAINT products_stock_check CHECK (stock >= 0 AND stock <= 1000000000))`,
    );
    await q.query(`CREATE INDEX products_category_idx ON products (category)`);
    await q.query(`CREATE INDEX products_active_idx ON products ("isActive")`);
    await q.query(
      `CREATE TABLE cart_items (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), "userId" uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE, "productId" uuid NOT NULL REFERENCES products(id) ON DELETE RESTRICT, quantity integer NOT NULL, CONSTRAINT cart_user_product_unique UNIQUE ("userId", "productId"), CONSTRAINT cart_quantity_check CHECK (quantity > 0 AND quantity <= 1000))`,
    );
    await q.query(
      `CREATE TABLE orders (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), "userId" uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT, "idempotencyKey" uuid NOT NULL, status orders_status_enum NOT NULL DEFAULT 'confirmed', total bigint NOT NULL, currency varchar NOT NULL DEFAULT 'VND', "createdAt" timestamptz NOT NULL DEFAULT now(), CONSTRAINT orders_idempotency_unique UNIQUE ("userId", "idempotencyKey"), CONSTRAINT orders_total_check CHECK (total >= 0 AND total <= 1000000000000))`,
    );
    await q.query(`CREATE INDEX orders_user_idx ON orders ("userId")`);
    await q.query(
      `CREATE TABLE order_items (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), "orderId" uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE, "productId" uuid NOT NULL, "productName" varchar NOT NULL, "unitPrice" bigint NOT NULL, quantity integer NOT NULL, CONSTRAINT order_items_quantity_check CHECK (quantity > 0 AND quantity <= 1000), CONSTRAINT order_items_price_check CHECK ("unitPrice" >= 0 AND "unitPrice" <= 1000000000))`,
    );
    await q.query(`CREATE INDEX order_items_order_idx ON order_items ("orderId")`);
  }
  async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE order_items, orders, cart_items, products, users`);
    await q.query(`DROP TYPE orders_status_enum`);
    await q.query(`DROP TYPE users_role_enum`);
  }
}
