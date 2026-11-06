import { ForbiddenException, Injectable } from '@nestjs/common';
import { ProductService } from '../products/product.service';
import { ChatDto } from './dto/chat.dto';
import { Product } from '../products/entities/product.entity';
import { Advice, ChatMessage, AdviceSchema, NeedsSchema } from './ai.schemas';
import { NEEDS_INSTRUCTION, SALES_SYSTEM_INSTRUCTION } from './ai.prompts';
import { ChatMemoryService } from './chat-memory.service';
import { LlmService } from './llm.service';
@Injectable()
export class AiService {
  constructor(
    private readonly products: ProductService,
    private readonly memory: ChatMemoryService,
    private readonly llm: LlmService,
  ) {}
  async chat(authenticatedUserId: string, dto: ChatDto) {
    // Never trust the userId supplied by the client; even staff cannot impersonate another user's chat.
    if (authenticatedUserId !== dto.userId)
      throw new ForbiddenException('userId phải trùng với tài khoản đã đăng nhập');
    return this.memory.withSession(dto.userId, dto.sessionId, async (state) => {
      const conversation = [...state.history, { role: 'user' as const, content: dto.message }];
      const needs = await this.llm.generate(
        'shopping_needs',
        NEEDS_INSTRUCTION,
        conversation,
        NeedsSchema,
      );
      // Invalid model budget is discarded rather than silently relaxing the user's filters.
      if (needs.minPrice !== null && needs.maxPrice !== null && needs.minPrice > needs.maxPrice) {
        return this.finish(
          dto,
          conversation,
          {
            text: 'Bạn cho mình xác nhận lại khoảng ngân sách tối thiểu và tối đa nhé?',
            productIds: [],
          },
          [],
        );
      }
      if (!needs.keywords.length && !needs.category) {
        return this.finish(
          dto,
          conversation,
          {
            text:
              needs.clarification ??
              'Bạn đang muốn tìm loại sản phẩm nào và ngân sách khoảng bao nhiêu?',
            productIds: [],
          },
          [],
        );
      }
      // SQL search executes on server; LLM never receives DB credentials or executes arbitrary SQL.
      const candidates = await this.products.search(needs);
      if (!candidates.length)
        return this.finish(
          dto,
          conversation,
          {
            text: 'Mình chưa tìm thấy sản phẩm còn hàng phù hợp. Bạn có muốn điều chỉnh loại sản phẩm, thuộc tính hoặc ngân sách không?',
            productIds: [],
          },
          [],
        );
      const catalog = candidates.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        price: p.price,
        currency: 'VND',
        stock: p.stock,
        category: p.category,
        tags: p.tags,
      }));
      const advice = await this.llm.generate(
        'sales_advice',
        SALES_SYSTEM_INSTRUCTION,
        [
          ...conversation,
          {
            role: 'user',
            content: JSON.stringify({
              CATALOG: catalog,
              needs,
              instruction: 'Hãy tư vấn dựa trên dữ liệu CATALOG này.',
            }),
          },
        ],
        AdviceSchema,
      );
      const candidateIds = new Set(candidates.map((p) => p.id));
      const ids = [...new Set(advice.productIds)];
      // Reject the whole prose if any unknown ID is present: filtering IDs alone leaves misleading text.
      if (ids.some((id) => !candidateIds.has(id))) {
        return this.finish(
          dto,
          conversation,
          {
            text: 'Mình cần xác nhận lại lựa chọn. Bạn có thể cho biết ưu tiên quan trọng nhất của bạn không?',
            productIds: [],
          },
          [],
        );
      }
      const current = await this.products.availableByIds(ids);
      if (
        current.length !== ids.length ||
        current.some((p) => {
          const previous = candidates.find((c) => c.id === p.id)!;
          return (
            p.price !== previous.price || p.updatedAt.getTime() !== previous.updatedAt.getTime()
          );
        })
      )
        return this.finish(
          dto,
          conversation,
          {
            text: 'Thông tin sản phẩm vừa thay đổi. Bạn hãy gửi lại nhu cầu để mình kiểm tra thông tin mới nhất nhé.',
            productIds: [],
          },
          [],
        );
      const attached = ids.map((id) => current.find((p) => p.id === id)!);
      return this.finish(dto, conversation, { text: advice.text, productIds: ids }, attached);
    });
  }
  private finish(dto: ChatDto, history: ChatMessage[], advice: Advice, products: Product[]) {
    return {
      state: {
        history: [
          ...history,
          { role: 'assistant' as const, content: JSON.stringify(advice) },
        ].slice(-24),
      },
      result: { sessionId: dto.sessionId, ...advice, products },
    };
  }
}
