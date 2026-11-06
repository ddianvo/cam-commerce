import { ConfigService } from '@nestjs/config';
import { AiService } from '../src/ai/ai.service';
import { ChatMemoryService } from '../src/ai/chat-memory.service';
import { LlmService } from '../src/ai/llm.service';
import { ProductService } from '../src/products/product.service';
import { Product } from '../src/products/entities/product.entity';
const id = '10000000-0000-4000-8000-000000000001';
const dto = { userId: 'u', sessionId: 's', message: 'giày nam dưới 700 nghìn' };
const needs = {
  keywords: ['giày', 'nam'],
  category: null,
  minPrice: null,
  maxPrice: 700000,
  clarification: null,
};
const product = {
  id,
  name: 'Giày Urban',
  price: 650000,
  stock: 2,
  updatedAt: new Date(),
} as Product;
function fixture() {
  const products = {
    search: jest.fn().mockResolvedValue([product]),
    availableByIds: jest.fn().mockResolvedValue([product]),
  };
  const llm = { generate: jest.fn<any, any[]>().mockResolvedValueOnce(needs) };
  const memory = new ChatMemoryService(
    new ConfigService({ CHAT_TTL_SECONDS: 1800, CHAT_MAX_SESSIONS: 100 }),
  );
  return {
    products,
    llm,
    service: new AiService(
      products as unknown as ProductService,
      memory,
      llm as unknown as LlmService,
    ),
  };
}
describe('catalog-grounded AI', () => {
  it('rejects client identity spoofing before any provider call', async () => {
    const f = fixture();
    await expect(f.service.chat('other', dto)).rejects.toThrow('userId');
    expect(f.llm.generate).not.toHaveBeenCalled();
  });
  it('returns actual catalog entities with matching IDs', async () => {
    const f = fixture();
    f.llm.generate.mockResolvedValueOnce({ text: 'Mẫu Urban phù hợp.', productIds: [id, id] });
    const response = await f.service.chat('u', dto);
    expect(response.productIds).toEqual([id]);
    expect(response.products).toEqual([product]);
    expect(f.products.search).toHaveBeenCalledWith(needs);
  });
  it('rejects hallucinated IDs and accompanying prose', async () => {
    const f = fixture();
    f.llm.generate.mockResolvedValueOnce({
      text: 'Sản phẩm tưởng tượng',
      productIds: ['20000000-0000-4000-8000-000000000001'],
    });
    const response = await f.service.chat('u', dto);
    expect(response.productIds).toEqual([]);
    expect(response.text).not.toContain('tưởng tượng');
    expect(f.products.availableByIds).not.toHaveBeenCalled();
  });
  it('does not ask the LLM to invent stock when search is empty', async () => {
    const f = fixture();
    f.products.search.mockResolvedValue([]);
    expect((await f.service.chat('u', dto)).products).toEqual([]);
    expect(f.llm.generate).toHaveBeenCalledTimes(1);
  });
  it('discards stale advice when product pricing changes', async () => {
    const f = fixture();
    f.llm.generate.mockResolvedValueOnce({ text: 'Giá 650000', productIds: [id] });
    f.products.availableByIds.mockResolvedValue([{ ...product, price: 700000 }]);
    const response = await f.service.chat('u', dto);
    expect(response.productIds).toEqual([]);
    expect(response.text).toContain('vừa thay đổi');
  });
  it('passes previous user preferences to the next extraction', async () => {
    const f = fixture();
    f.llm.generate.mockResolvedValueOnce({ text: 'Urban', productIds: [id] });
    await f.service.chat('u', dto);
    f.llm.generate
      .mockResolvedValueOnce({ ...needs, keywords: [] })
      .mockResolvedValueOnce({ text: 'Urban', productIds: [id] });
    await f.service.chat('u', { ...dto, message: 'màu đen nhé' });
    const messages = f.llm.generate.mock.calls[2][2] as { content: string }[];
    expect(messages[0].content).toBe(dto.message);
    expect(messages.at(-1)?.content).toBe('màu đen nhé');
  });
});
