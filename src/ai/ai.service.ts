import { ForbiddenException, Injectable } from '@nestjs/common';
import { Product } from '../products/entities/product.entity';
import { buildSearchText, normalizeText } from '../products/product-search';
import { ProductService } from '../products/product.service';
import { ChatState } from './ai.schemas';
import { ChatMemoryService } from './chat-memory.service';
import { ChatDto } from './dto/chat.dto';
import { predictProductQuery } from './intent-model';
import { readShoppingNeeds, ShoppingNeeds } from './shopping-needs';

const vnd = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' });
const welcome =
  'Bạn đang tìm món gì? Cho mình biết loại sản phẩm và ngân sách khoảng bao nhiêu nhé.';

@Injectable()
export class AiService {
  constructor(
    private readonly products: ProductService,
    private readonly memory: ChatMemoryService,
  ) {}

  async chat(authenticatedUserId: string, dto: ChatDto) {
    if (authenticatedUserId !== dto.userId)
      throw new ForbiddenException('userId phải trùng với tài khoản đã đăng nhập');

    return this.memory.withSession(dto.userId, dto.sessionId, async (state) => {
      const { needs, invalidBudget } = readShoppingNeeds(dto.message, state.needs ?? {});
      const answer = invalidBudget
        ? {
            text: 'Bạn cho mình xác nhận ngân sách, ví dụ “dưới 500k” hoặc “từ 300k đến 600k” nhé?',
          }
        : await this.advise(needs);
      const products = answer.products ?? [];
      const result = {
        sessionId: dto.sessionId,
        text: answer.text,
        productIds: products.map((p) => p.id),
        products,
      };
      const next: ChatState = {
        needs,
        history: [
          ...state.history,
          { role: 'user', content: dto.message },
          {
            role: 'assistant',
            content: JSON.stringify({ text: result.text, productIds: result.productIds }),
          },
        ],
      };
      return { state: next, result };
    });
  }

  private async advise(needs: ShoppingNeeds): Promise<{ text: string; products?: Product[] }> {
    if (!needs.query) return { text: welcome };

    const catalog = await this.products.listChatCatalog();
    let matches = this.findMatches(catalog, needs.query);
    if (!matches.length) {
      const predicted = predictProductQuery(needs.query);
      if (predicted) matches = this.findMatches(catalog, predicted);
    }
    if (!matches.length) {
      return {
        text: 'Mình chưa nhận ra món bạn đang tìm. Bạn cho mình tên hoặc loại sản phẩm cụ thể hơn nhé?',
      };
    }

    const suitable = matches.filter(
      ({ product, attributes }) =>
        product.stock > 0 &&
        (needs.minPrice === undefined || product.price >= needs.minPrice) &&
        (needs.maxPrice === undefined || product.price <= needs.maxPrice) &&
        (!needs.audience ||
          attributes.includes(' ' + needs.audience + ' ') ||
          attributes.includes(' unisex ')) &&
        (!needs.color || attributes.includes(' ' + needs.color + ' ')),
    );
    const products = suitable
      .sort((a, b) => {
        const priceDifference = a.product.price - b.product.price;
        return needs.cheapest
          ? priceDifference || b.score - a.score
          : b.score - a.score || priceDifference;
      })
      .slice(0, 3)
      .map(({ product }) => product);

    if (!products.length)
      return {
        text: 'Mình chưa thấy sản phẩm còn hàng khớp với yêu cầu. Bạn muốn đổi ngân sách hoặc thuộc tính nào?',
      };

    const top = products[0];
    return {
      text:
        'Mình tìm được ' +
        products.length +
        ' lựa chọn phù hợp. Bạn có thể xem ' +
        top.name +
        ' (' +
        vnd.format(top.price) +
        ') trước nhé.',
      products,
    };
  }

  private findMatches(catalog: Product[], query: string) {
    const normalized = query.replace(/\bba lo\b/g, 'balo');
    const exactCategory = catalog.some((product) => normalizeText(product.category) === normalized);
    const terms = [...new Set(normalized.split(' '))];
    const phrase = ' ' + normalized + ' ';

    return catalog.flatMap((product) => {
      const name = ' ' + normalizeText(product.name) + ' ';
      const category = ' ' + normalizeText(product.category) + ' ';
      const tags = ' ' + normalizeText(product.tags.join(' ')) + ' ';
      const searchable = ' ' + buildSearchText(product) + ' ';
      if (
        exactCategory
          ? category !== phrase
          : !terms.every((term) => searchable.includes(' ' + term + ' '))
      )
        return [];

      const score =
        Number(name.includes(phrase)) * 10 +
        Number(tags.includes(phrase)) * 5 +
        terms.filter((term) => name.includes(' ' + term + ' ')).length;
      // Attribute filters use the name and tags, where the catalog describes sellable variants.
      const attributes = (name + tags).replace(/\s+/g, ' ');
      return [{ product, score, attributes }];
    });
  }
}
