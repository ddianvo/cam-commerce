import extraCatalog from './catalog.json';
import { Coupon } from '../coupons/entities/coupon.entity';
import 'dotenv/config';
import { hash } from 'bcryptjs';
import db from './data-source';
import { User, Role } from '../users/entities/user.entity';
import { Product } from '../products/entities/product.entity';
import { buildSearchText } from '../products/product-search';
async function seed() {
  await db.initialize();
  try {
    await db.transaction(async (em) => {
      const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
      const password = process.env.SEED_ADMIN_PASSWORD;
      if (email && password) {
        if (password.length < 10 || Buffer.byteLength(password, 'utf8') > 72)
          throw new Error('Seed admin password must be 10+ characters and <=72 UTF-8 bytes');
        if (!(await em.findOneBy(User, { email })))
          await em.save(
            User,
            em.create(User, { email, passwordHash: await hash(password, 12), role: Role.ADMIN }),
          );
      }
      const products = [
        {
          id: '10000000-0000-4000-8000-000000000001',
          name: 'Giày thể thao nam Urban',
          description: 'Giày nam màu đen, đế cao su, phù hợp đi bộ hằng ngày.',
          price: 650000,
          stock: 20,
          category: 'Giày',
          tags: ['nam', 'giày thể thao', 'sneaker', 'đen', 'đi bộ'],
        },
        {
          id: '10000000-0000-4000-8000-000000000002',
          name: 'Giày thể thao nữ Light',
          description: 'Giày nữ màu trắng, thân vải, phù hợp đi bộ.',
          price: 550000,
          stock: 15,
          category: 'Giày',
          tags: ['nữ', 'giày thể thao', 'sneaker', 'trắng', 'đi bộ'],
        },
        {
          id: '10000000-0000-4000-8000-000000000003',
          name: 'Balo Daily 20L',
          description: 'Balo dung tích 20 lít, có ngăn laptop 14 inch.',
          price: 390000,
          stock: 10,
          category: 'Balo',
          tags: ['balo', 'unisex', 'laptop', 'đi học', 'đi làm'],
        },
      ];
      for (const p of [...products, ...extraCatalog])
        if (!(await em.findOneBy(Product, { id: p.id })))
          await em.save(
            Product,
            em.create(Product, { ...p, searchText: buildSearchText(p), isActive: true }),
          );
      const couponRows = [
        {
          code: 'CAM10',
          description: 'Giảm 10%, tối đa 100.000đ, đơn từ 200.000đ',
          kind: 'percent' as const,
          value: 10,
          minSubtotal: 200000,
          maxDiscount: 100000,
          maxUses: 5000,
          perUserLimit: 3,
        },
        {
          code: 'GIAM50K',
          description: 'Giảm 50.000đ cho đơn từ 500.000đ',
          kind: 'fixed' as const,
          value: 50000,
          minSubtotal: 500000,
          maxDiscount: 50000,
          maxUses: 1000,
          perUserLimit: 1,
        },
        {
          code: 'CAM20',
          description: 'Giảm 20%, tối đa 200.000đ, đơn từ 1.000.000đ',
          kind: 'percent' as const,
          value: 20,
          minSubtotal: 1000000,
          maxDiscount: 200000,
          maxUses: 500,
          perUserLimit: 1,
        },
      ];
      for (const row of couponRows)
        if (!(await em.findOneBy(Coupon, { code: row.code })))
          await em.save(
            Coupon,
            em.create(Coupon, {
              ...row,
              startsAt: new Date('2026-01-01T00:00:00Z'),
              expiresAt: new Date('2027-12-31T16:59:59Z'),
              isActive: true,
              usedCount: 0,
            }),
          );
    });
    console.log('Seed complete. Existing users and products were preserved.');
  } finally {
    await db.destroy();
  }
}
void seed().catch(() => {
  console.error('Seed failed. Check database and seed configuration.');
  process.exitCode = 1;
});
