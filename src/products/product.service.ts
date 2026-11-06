import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository, SelectQueryBuilder } from 'typeorm';
import { Product } from './entities/product.entity';
import { CreateProductDto, ProductQueryDto, UpdateProductDto } from './dto/product.dto';
import { buildSearchText, normalizeText, searchTokens } from './product-search';
export interface SearchNeeds {
  keywords: string[];
  category: string | null;
  minPrice: number | null;
  maxPrice: number | null;
}
@Injectable()
export class ProductService {
  constructor(@InjectRepository(Product) private readonly products: Repository<Product>) {}
  async create(dto: CreateProductDto) {
    return this.products.save(this.products.create({ ...dto, searchText: buildSearchText(dto) }));
  }
  async list(
    query: ProductQueryDto,
    includeInactive = false,
    status: 'all' | 'active' | 'inactive' = 'all',
  ) {
    const qb = this.products
      .createQueryBuilder('p')
      .where(includeInactive ? '1=1' : 'p.isActive = true');
    if (includeInactive && status !== 'all')
      qb.andWhere('p.isActive = :active', { active: status === 'active' });
    if (
      query.minPrice !== undefined &&
      query.maxPrice !== undefined &&
      query.minPrice > query.maxPrice
    )
      throw new BadRequestException('Khoảng giá không hợp lệ');
    if (query.q) this.applyKeywords(qb, searchTokens(query.q));
    if (query.category) qb.andWhere('p.category = :category', { category: query.category });
    if (query.minPrice !== undefined)
      qb.andWhere('p.price >= :minPrice', { minPrice: query.minPrice });
    if (query.maxPrice !== undefined)
      qb.andWhere('p.price <= :maxPrice', { maxPrice: query.maxPrice });
    const [items, total] = await qb
      .orderBy('p.createdAt', 'DESC')
      .addOrderBy('p.id', 'ASC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getManyAndCount();
    return { items, total, page: query.page, limit: query.limit };
  }
  async get(id: string) {
    const product = await this.products.findOneBy({ id, isActive: true });
    if (!product) throw new NotFoundException('Không tìm thấy sản phẩm');
    return product;
  }
  async update(id: string, dto: UpdateProductDto) {
    // Atomic SQL patch avoids overwriting concurrent checkout stock changes.
    const patch: Record<string, unknown> = { ...dto };
    const changed = ['name', 'description', 'category', 'tags'].some((key) => key in dto);
    if (changed) {
      // Serialize catalog updates with checkout and other catalog edits.
      return this.products.manager.transaction(async (manager) => {
        const repo = manager.getRepository(Product);
        const product = await repo.findOne({ where: { id }, lock: { mode: 'pessimistic_write' } });
        if (!product) throw new NotFoundException('Không tìm thấy sản phẩm');
        Object.assign(product, dto);
        product.searchText = buildSearchText(product);
        return repo.save(product);
      });
    }
    const result = await this.products.update(id, patch);
    if (!result.affected) throw new NotFoundException('Không tìm thấy sản phẩm');
    return this.products.findOneByOrFail({ id });
  }
  async remove(id: string) {
    const result = await this.products.update(id, { isActive: false });
    if (!result.affected) throw new NotFoundException('Không tìm thấy sản phẩm');
    return { id, isActive: false };
  }
  async search(needs: SearchNeeds): Promise<Product[]> {
    const qb = this.products
      .createQueryBuilder('p')
      .where('p.isActive = true')
      .andWhere('p.stock > 0');
    this.applyKeywords(qb, searchTokens(needs.keywords.join(' ')));
    if (needs.category)
      qb.andWhere('p.searchText LIKE :category', {
        category: '%' + normalizeText(needs.category) + '%',
      });
    if (needs.minPrice !== null) qb.andWhere('p.price >= :min', { min: needs.minPrice });
    if (needs.maxPrice !== null) qb.andWhere('p.price <= :max', { max: needs.maxPrice });
    return qb.orderBy('p.price', 'ASC').addOrderBy('p.id', 'ASC').take(12).getMany();
  }
  async availableByIds(ids: string[]): Promise<Product[]> {
    if (!ids.length) return [];
    return this.products
      .find({ where: { id: In(ids), isActive: true } })
      .then((items) => items.filter((p) => p.stock > 0));
  }
  private applyKeywords(qb: SelectQueryBuilder<Product>, tokens: string[]) {
    // Match every term (AND); tags can contain synonyms. Bound parameters prevent SQL injection.
    tokens.forEach((token, i) =>
      qb.andWhere('p.searchText LIKE :term' + i, { ['term' + i]: '%' + token + '%' }),
    );
  }
}
