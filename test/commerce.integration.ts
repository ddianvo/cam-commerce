import { Coupon } from '../src/coupons/entities/coupon.entity';
import 'reflect-metadata';
import { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { AuthService } from '../src/auth/auth.service';
import { setupApp } from '../src/common/setup-app';
import { User, Role } from '../src/users/entities/user.entity';
import { Product } from '../src/products/entities/product.entity';
import { ProductService } from '../src/products/product.service';
import { CartService } from '../src/cart/cart.service';
import { OrderService } from '../src/orders/order.service';
import { CartItem } from '../src/cart/entities/cart-item.entity';
import { Order } from '../src/orders/entities/order.entity';
import { databaseOptions } from '../src/database/data-source';

describe('real PostgreSQL commerce API', () => {
  let app: INestApplication, db: DataSource;
  let customer: { token: string; id: string }, staff: { token: string; id: string };
  async function register() {
    const response = await app
      .get(AuthService)
      .register({ email: randomUUID() + '@example.com', password: 'valid-password-123' });
    return { token: response.accessToken, id: response.user.id };
  }
  async function product(stock = 5, price = 650000) {
    return app.get(ProductService).create({
      name: 'Giày thể thao nam ' + randomUUID(),
      description: 'Giày màu đen',
      category: 'Giày',
      tags: ['nam', 'đen'],
      price,
      stock,
    });
  }
  beforeAll(async () => {
    const url = process.env.TEST_DATABASE_URL;
    if (!url || !new URL(url).pathname.endsWith('_test'))
      throw new Error('Set TEST_DATABASE_URL to a dedicated database whose name ends with _test');
    process.env.DATABASE_URL = url;
    process.env.JWT_SECRET = 'integration-only-secret-at-least-32-characters';
    process.env.JWT_EXPIRES_SECONDS = '900';
    process.env.NODE_ENV = 'test';
    process.env.REDIS_URL = '';
    const migrationDb = await new DataSource(databaseOptions(url)).initialize();
    try {
      await migrationDb.runMigrations();
    } finally {
      await migrationDb.destroy();
    }
    const { AppModule } = await import('../src/app.module');
    app = await NestFactory.create(AppModule, { logger: ['error'], abortOnError: false });
    setupApp(app, 'http://localhost:5173');
    await app.init();
    db = app.get(DataSource);
    customer = await register();
    staff = await register();
    await db.getRepository(User).update(staff.id, { role: Role.STAFF });
  });
  afterAll(async () => {
    await app?.close();
  });
  it('registers customers, validates passwords, and issues usable login tokens', async () => {
    const email = randomUUID() + '@example.com';
    const body = { email, password: 'valid-password-123' };
    const signup = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send(body)
      .expect(201);
    expect(signup.body.user.role).toBe('customer');
    expect(signup.body.user.passwordHash).toBeUndefined();
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ ...body, password: 'wrong-password-123' })
      .expect(401);
    const login = await request(app.getHttpServer()).post('/api/auth/login').send(body).expect(201);
    expect(login.body.expiresIn).toBe(900);
    await request(app.getHttpServer())
      .get('/api/cart')
      .auth(login.body.accessToken, { type: 'bearer' })
      .expect(200);
  });
  it('denies anonymous cart access', async () => {
    await request(app.getHttpServer()).get('/api/cart').expect(401);
  });
  it('rejects privilege injection during registration', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email: 'x@example.com', password: 'valid-password-123', role: 'admin' })
      .expect(400);
  });
  it('enforces product write roles using current database role', async () => {
    const payload = {
      name: 'Balo ' + randomUUID(),
      description: 'Balo laptop',
      price: 100000,
      stock: 2,
      category: 'Balo',
      tags: ['laptop'],
    };
    await request(app.getHttpServer())
      .post('/api/products')
      .auth(customer.token, { type: 'bearer' })
      .send(payload)
      .expect(403);
    await request(app.getHttpServer())
      .post('/api/products')
      .auth(staff.token, { type: 'bearer' })
      .send(payload)
      .expect(201);
  });
  it('finds Vietnamese tags with an unaccented parameterized query', async () => {
    await product();
    const response = await request(app.getHttpServer())
      .get('/api/products')
      .query({ q: 'giay den' })
      .expect(200);
    expect(response.body.items.length).toBeGreaterThan(0);
    const injection = await request(app.getHttpServer())
      .get('/api/products')
      .query({ q: "' OR 1=1 --" })
      .expect(200);
    expect(injection.body.total).toBe(0);
  });
  it('checks out through HTTP and replays the same idempotency key', async () => {
    const buyer = await register(),
      p = await product();
    const key = randomUUID();
    await request(app.getHttpServer())
      .put('/api/cart/items')
      .auth(buyer.token, { type: 'bearer' })
      .send({ productId: p.id, quantity: 2 })
      .expect(200);
    const first = await request(app.getHttpServer())
      .post('/api/orders/checkout')
      .auth(buyer.token, { type: 'bearer' })
      .send({ idempotencyKey: key })
      .expect(201);
    const replay = await request(app.getHttpServer())
      .post('/api/orders/checkout')
      .auth(buyer.token, { type: 'bearer' })
      .send({ idempotencyKey: key })
      .expect(201);
    expect(first.body.total).toBe(1300000);
    expect(replay.body.id).toBe(first.body.id);
    expect((await db.getRepository(Product).findOneByOrFail({ id: p.id })).stock).toBe(3);
    await request(app.getHttpServer())
      .get('/api/orders/' + first.body.id)
      .auth(customer.token, { type: 'bearer' })
      .expect(404);
  });
  it('allows only one checkout for the last unit with concurrent buyers', async () => {
    const a = await register(),
      b = await register(),
      p = await product(1);
    const cart = app.get(CartService),
      orders = app.get(OrderService);
    await cart.set(a.id, { productId: p.id, quantity: 1 });
    await cart.set(b.id, { productId: p.id, quantity: 1 });
    const results = await Promise.allSettled([
      orders.checkout(a.id, randomUUID()),
      orders.checkout(b.id, randomUUID()),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((r) => r.status === 'rejected')).toHaveLength(1);
    expect((await db.getRepository(Product).findOneByOrFail({ id: p.id })).stock).toBe(0);
  });
  it('serializes duplicate simultaneous checkout requests', async () => {
    const buyer = await register(),
      p = await product(3),
      key = randomUUID();
    await app.get(CartService).set(buyer.id, { productId: p.id, quantity: 1 });
    const results = await Promise.all([
      app.get(OrderService).checkout(buyer.id, key),
      app.get(OrderService).checkout(buyer.id, key),
    ]);
    expect(results[0].id).toBe(results[1].id);
    expect((await db.getRepository(Product).findOneByOrFail({ id: p.id })).stock).toBe(2);
  });
  it('rolls back earlier stock decrements and preserves cart when a later product is unavailable', async () => {
    const buyer = await register();
    const products = [await product(2), await product(2)].sort((a, b) => a.id.localeCompare(b.id));
    for (const p of products)
      await app.get(CartService).set(buyer.id, { productId: p.id, quantity: 1 });
    await db.getRepository(Product).update(products[1].id, { stock: 0 });
    await expect(app.get(OrderService).checkout(buyer.id, randomUUID())).rejects.toThrow('tồn kho');
    expect((await db.getRepository(Product).findOneByOrFail({ id: products[0].id })).stock).toBe(2);
    expect(await db.getRepository(CartItem).countBy({ userId: buyer.id })).toBe(2);
    expect(await db.getRepository(Order).countBy({ userId: buyer.id })).toBe(0);
  });
  it('validates chat identity and DTO before calling AI', async () => {
    await request(app.getHttpServer())
      .post('/api/ai/chat')
      .auth(customer.token, { type: 'bearer' })
      .send({ userId: staff.id, sessionId: randomUUID(), message: 'giày' })
      .expect(403);
    await request(app.getHttpServer())
      .post('/api/ai/chat')
      .auth(customer.token, { type: 'bearer' })
      .send({ userId: customer.id, sessionId: randomUUID(), message: '   ' })
      .expect(400);
  });
  it('recommends real in-stock products and remembers follow-up filters without a provider', async () => {
    const sessionId = randomUUID();
    const send = (message: string, id = sessionId) =>
      request(app.getHttpServer())
        .post('/api/ai/chat')
        .auth(customer.token, { type: 'bearer' })
        .send({ userId: customer.id, sessionId: id, message })
        .expect(200);
    const p = await app.get(ProductService).create({
      name: 'Tai nghe ' + randomUUID(),
      description: 'Tai nghe có dây màu đen.',
      category: 'Điện tử',
      tags: ['tai nghe', 'đen'],
      price: 240000,
      stock: 1,
    });
    const response = await send('Nghe nhạc riêng tư dưới 300k');
    expect(response.body.productIds).toEqual([p.id]);
    expect(response.body.products[0]).toMatchObject({ id: p.id, price: 240000, stock: 1 });
    expect(response.body.text).toContain(p.name);

    expect((await send('màu đen nhé')).body.productIds).toEqual([p.id]);
    expect((await send('màu đỏ nhé')).body.productIds).toEqual([]);
    expect((await send('màu đen nhé', randomUUID())).body.productIds).toEqual([]);

    await db.getRepository(Product).update(p.id, { stock: 0 });
    expect((await send('màu đen nhé')).body.productIds).toEqual([]);
  });
  it('revokes issued tokens on logout', async () => {
    const buyer = await register();
    await request(app.getHttpServer())
      .post('/api/auth/logout')
      .auth(buyer.token, { type: 'bearer' })
      .expect(201);
    await request(app.getHttpServer())
      .get('/api/cart')
      .auth(buyer.token, { type: 'bearer' })
      .expect(401);
  });
  async function coupon(overrides: Partial<Coupon> = {}) {
    return db.getRepository(Coupon).save(
      db.getRepository(Coupon).create({
        code: 'T' + randomUUID().replace(/-/g, '').slice(0, 20).toUpperCase(),
        description: 'Integration coupon',
        kind: 'percent',
        value: 10,
        minSubtotal: 200000,
        maxDiscount: 100000,
        maxUses: 10,
        perUserLimit: 1,
        usedCount: 0,
        startsAt: new Date(Date.now() - 60000),
        expiresAt: new Date(Date.now() + 3600000),
        isActive: true,
        ...overrides,
      }),
    );
  }
  it('previews a normalized coupon from server cart totals without consuming it', async () => {
    const buyer = await register(),
      p = await product(),
      c = await coupon();
    await app.get(CartService).set(buyer.id, { productId: p.id, quantity: 2 });
    await request(app.getHttpServer())
      .post('/api/coupons/preview')
      .send({ code: c.code })
      .expect(401);
    for (let i = 0; i < 2; i++) {
      const preview = await request(app.getHttpServer())
        .post('/api/coupons/preview')
        .auth(buyer.token, { type: 'bearer' })
        .send({ code: ' ' + c.code.toLowerCase() + ' ' })
        .expect(200);
      expect(preview.body).toMatchObject({
        subtotal: 1300000,
        discount: 100000,
        total: 1200000,
        code: c.code,
      });
    }
    expect((await db.getRepository(Coupon).findOneByOrFail({ id: c.id })).usedCount).toBe(0);
  });
  it('rejects coupon tampering and expired, future, exhausted or below-minimum codes', async () => {
    const buyer = await register(),
      p = await product();
    await app.get(CartService).set(buyer.id, { productId: p.id, quantity: 1 });
    const codes = [
      await coupon({
        expiresAt: new Date(Date.now() - 1000),
        startsAt: new Date(Date.now() - 60000),
      }),
      await coupon({ startsAt: new Date(Date.now() + 10000) }),
      await coupon({ usedCount: 10 }),
      await coupon({ minSubtotal: 999999 }),
      await coupon({ isActive: false }),
    ];
    for (const c of codes)
      await request(app.getHttpServer())
        .post('/api/coupons/preview')
        .auth(buyer.token, { type: 'bearer' })
        .send({ code: c.code })
        .expect(400);
    await request(app.getHttpServer())
      .post('/api/coupons/preview')
      .auth(buyer.token, { type: 'bearer' })
      .send({ code: 'UNKNOWN-CODE' })
      .expect(400);
    await request(app.getHttpServer())
      .post('/api/coupons/preview')
      .auth(buyer.token, { type: 'bearer' })
      .send({ code: codes[0].code, subtotal: 999999999 })
      .expect(400);
  });
  it('persists discounted order snapshots and redeems only once on checkout replay', async () => {
    const buyer = await register(),
      p = await product(),
      c = await coupon();
    await app.get(CartService).set(buyer.id, { productId: p.id, quantity: 1 });
    const key = randomUUID(),
      orders = app.get(OrderService);
    const first = await orders.checkout(buyer.id, key, c.code);
    const replay = await orders.checkout(buyer.id, key, c.code);
    expect(first).toMatchObject({
      subtotal: 650000,
      discount: 65000,
      total: 585000,
      couponCode: c.code,
    });
    expect(replay.id).toBe(first.id);
    expect((await db.getRepository(Coupon).findOneByOrFail({ id: c.id })).usedCount).toBe(1);
    await app.get(CartService).set(buyer.id, { productId: p.id, quantity: 1 });
    await expect(orders.checkout(buyer.id, randomUUID(), c.code)).rejects.toThrow('dùng hết lượt');
    expect((await db.getRepository(Product).findOneByOrFail({ id: p.id })).stock).toBe(4);
  });
  it('rolls back stock and keeps the cart when an invalid coupon is used at checkout', async () => {
    const buyer = await register(),
      p = await product();
    await app.get(CartService).set(buyer.id, { productId: p.id, quantity: 1 });
    await expect(app.get(OrderService).checkout(buyer.id, randomUUID(), 'INVALID')).rejects.toThrow(
      'Mã giảm giá',
    );
    expect((await db.getRepository(Product).findOneByOrFail({ id: p.id })).stock).toBe(5);
    expect(await db.getRepository(CartItem).countBy({ userId: buyer.id })).toBe(1);
    expect(await db.getRepository(Order).countBy({ userId: buyer.id })).toBe(0);
  });
  it('serializes concurrent buyers competing for the last coupon redemption', async () => {
    const a = await register(),
      b = await register(),
      p1 = await product(),
      p2 = await product(),
      c = await coupon({ maxUses: 1 });
    await app.get(CartService).set(a.id, { productId: p1.id, quantity: 1 });
    await app.get(CartService).set(b.id, { productId: p2.id, quantity: 1 });
    const results = await Promise.allSettled([
      app.get(OrderService).checkout(a.id, randomUUID(), c.code),
      app.get(OrderService).checkout(b.id, randomUUID(), c.code),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((r) => r.status === 'rejected')).toHaveLength(1);
    expect((await db.getRepository(Coupon).findOneByOrFail({ id: c.id })).usedCount).toBe(1);
    const stocks = await db.getRepository(Product).findBy([{ id: p1.id }, { id: p2.id }]);
    expect(stocks.map((p) => p.stock).sort()).toEqual([4, 5]);
  });
  it('accepts a fixed coupon through the HTTP checkout contract', async () => {
    const buyer = await register(),
      p = await product(),
      c = await coupon({ kind: 'fixed', value: 50000, maxDiscount: 50000 });
    await app.get(CartService).set(buyer.id, { productId: p.id, quantity: 1 });
    await request(app.getHttpServer())
      .post('/api/orders/checkout')
      .auth(buyer.token, { type: 'bearer' })
      .send({ idempotencyKey: randomUUID(), couponCode: c.code, total: 1 })
      .expect(400);
    const response = await request(app.getHttpServer())
      .post('/api/orders/checkout')
      .auth(buyer.token, { type: 'bearer' })
      .send({ idempotencyKey: randomUUID(), couponCode: c.code })
      .expect(201);
    expect(response.body.total).toBe(600000);
    expect(response.body.discount).toBe(50000);
  });
  async function administrator() {
    const user = await register();
    await db.getRepository(User).update(user.id, { role: Role.ADMIN });
    return user;
  }
  it('returns current account identity without private fields', async () => {
    const me = await request(app.getHttpServer())
      .get('/api/auth/me')
      .auth(staff.token, { type: 'bearer' })
      .expect(200);
    expect(me.body).toMatchObject({ id: staff.id, role: 'staff' });
    expect(me.body.passwordHash).toBeUndefined();
    expect(me.body.tokenVersion).toBeUndefined();
  });
  it('restricts product management and keeps inactive products off public APIs', async () => {
    const hidden = await app.get(ProductService).create({
      name: 'Hidden ' + randomUUID(),
      description: 'Admin fixture',
      price: 150000,
      stock: 5,
      category: 'QA',
      tags: ['fixture'],
      isActive: false,
    });
    await request(app.getHttpServer()).get('/api/products/manage').expect(401);
    await request(app.getHttpServer())
      .get('/api/products/manage')
      .auth(customer.token, { type: 'bearer' })
      .expect(403);
    const managed = await request(app.getHttpServer())
      .get('/api/products/manage?status=inactive')
      .auth(staff.token, { type: 'bearer' })
      .expect(200);
    expect(managed.body.items.some((p: Product) => p.id === hidden.id)).toBe(true);
    await request(app.getHttpServer())
      .get('/api/products/' + hidden.id)
      .expect(404);
    await request(app.getHttpServer()).get('/api/products?status=all').expect(400);
  });
  it('supports admin create, edit, soft delete and restoration while preserving stock', async () => {
    const admin = await administrator();
    const created = await request(app.getHttpServer())
      .post('/api/products')
      .auth(admin.token, { type: 'bearer' })
      .send({
        name: 'Admin item ' + randomUUID(),
        description: 'Product fixture',
        price: 250000,
        stock: 10,
        category: 'QA',
        tags: ['qa'],
        imageUrl: '/images/backpack.jpg',
      })
      .expect(201);
    const id = created.body.id;
    await db.getRepository(Product).decrement({ id }, 'stock', 2);
    const edited = await request(app.getHttpServer())
      .patch('/api/products/' + id)
      .auth(admin.token, { type: 'bearer' })
      .send({ price: 275000, name: 'Updated ' + id })
      .expect(200);
    expect(edited.body.stock).toBe(8);
    expect(edited.body.price).toBe(275000);
    expect(edited.body.imageUrl).toBe('/images/backpack.jpg');
    await request(app.getHttpServer())
      .delete('/api/products/' + id)
      .auth(staff.token, { type: 'bearer' })
      .expect(403);
    await request(app.getHttpServer())
      .patch('/api/products/' + id)
      .auth(staff.token, { type: 'bearer' })
      .send({ isActive: false })
      .expect(403);
    await request(app.getHttpServer())
      .delete('/api/products/' + id)
      .auth(admin.token, { type: 'bearer' })
      .expect(200);
    await request(app.getHttpServer())
      .get('/api/products/' + id)
      .expect(404);
    expect(await db.getRepository(Product).countBy({ id })).toBe(1);
    await request(app.getHttpServer())
      .patch('/api/products/' + id)
      .auth(staff.token, { type: 'bearer' })
      .send({ isActive: true })
      .expect(403);
    await request(app.getHttpServer())
      .patch('/api/products/' + id)
      .auth(admin.token, { type: 'bearer' })
      .send({ isActive: true })
      .expect(200);
    await request(app.getHttpServer())
      .get('/api/products/' + id)
      .expect(200);
  });
  it('validates admin inputs and blocks staff from creating hidden catalog entries', async () => {
    const admin = await administrator(),
      payload = {
        name: 'Fixture',
        description: 'Fixture description',
        price: 50000,
        stock: 2,
        category: 'QA',
        tags: [],
      };
    await request(app.getHttpServer())
      .post('/api/products')
      .auth(staff.token, { type: 'bearer' })
      .send({ ...payload, isActive: false })
      .expect(403);
    await request(app.getHttpServer())
      .post('/api/products')
      .auth(admin.token, { type: 'bearer' })
      .send({ ...payload, name: '   ' })
      .expect(400);
    await request(app.getHttpServer())
      .post('/api/products')
      .auth(admin.token, { type: 'bearer' })
      .send({ ...payload, price: -1 })
      .expect(400);
    await request(app.getHttpServer())
      .post('/api/products')
      .auth(admin.token, { type: 'bearer' })
      .send({ ...payload, imageUrl: 'https://example.com/tracker.jpg' })
      .expect(400);
  });
  it('guards dashboard and order management and returns safe buyer metadata', async () => {
    const buyer = await register(),
      p = await product();
    await app.get(CartService).set(buyer.id, { productId: p.id, quantity: 1 });
    const order = await app.get(OrderService).checkout(buyer.id, randomUUID());
    await request(app.getHttpServer())
      .get('/api/admin/overview')
      .auth(customer.token, { type: 'bearer' })
      .expect(403);
    await request(app.getHttpServer())
      .get('/api/orders/manage')
      .auth(customer.token, { type: 'bearer' })
      .expect(403);
    const stats = await request(app.getHttpServer())
      .get('/api/admin/overview')
      .auth(staff.token, { type: 'bearer' })
      .expect(200);
    expect(stats.body.totalProducts).toBe(await db.getRepository(Product).count());
    expect(stats.body.totalOrders).toBe(await db.getRepository(Order).count());
    const managed = await request(app.getHttpServer())
      .get('/api/orders/manage?q=' + order.id)
      .auth(staff.token, { type: 'bearer' })
      .expect(200);
    expect(managed.body.total).toBe(1);
    expect(managed.body.items[0].customer.id).toBe(buyer.id);
    expect(managed.body.items[0].customer.passwordHash).toBeUndefined();
    expect(managed.body.items[0].user).toBeUndefined();
    await request(app.getHttpServer())
      .patch('/api/orders/' + order.id + '/status')
      .auth(staff.token, { type: 'bearer' })
      .send({ status: 'shipped' })
      .expect(200);
    await request(app.getHttpServer())
      .patch('/api/orders/' + order.id + '/status')
      .auth(staff.token, { type: 'bearer' })
      .send({ status: 'confirmed' })
      .expect(409);
    await request(app.getHttpServer())
      .patch('/api/orders/' + order.id + '/status')
      .auth(staff.token, { type: 'bearer' })
      .send({ status: 'delivered' })
      .expect(200);
  });
});
