import { MigrationInterface, QueryRunner } from 'typeorm';
export class ProductImages1762480000000 implements MigrationInterface {
  name = 'ProductImages1762480000000';
  async up(q: QueryRunner) {
    await q.query('ALTER TABLE products ADD COLUMN "imageUrl" varchar(200)');
  }
  async down(q: QueryRunner) {
    await q.query('ALTER TABLE products DROP COLUMN "imageUrl"');
  }
}
