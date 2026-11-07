import { predictProductQuery } from '../src/ai/intent-model';
import { readShoppingNeeds } from '../src/ai/shopping-needs';

describe('local shopping assistant', () => {
  it('generalizes a shopping need from labeled phrases', () => {
    expect(predictProductQuery('nghe nhạc riêng tư trên xe buýt')).toBe('tai nghe');
    expect(predictProductQuery('thời tiết hôm nay thế nào')).toBeUndefined();
  });

  it('remembers product type and price for a follow-up without accents', () => {
    const first = readShoppingNeeds('Tìm giày nam dưới 700 nghìn', {});
    expect(first.needs).toMatchObject({ query: 'giay', audience: 'nam', maxPrice: 699999 });
    const second = readShoppingNeeds('mau den nhe', first.needs);
    expect(second.needs).toMatchObject({ ...first.needs, color: 'den' });
  });

  it('supports decimal millions and rejects contradictory ranges', () => {
    const { needs } = readShoppingNeeds('balo từ 500.000đ đến 1,5 triệu', {});
    expect(needs).toMatchObject({ query: 'balo', minPrice: 500000, maxPrice: 1500000 });
    expect(readShoppingNeeds('từ 900k tới 300k', needs)).toEqual({ needs, invalidBudget: true });
  });

  it('uses the existing budget when the customer changes product types', () => {
    const { needs } = readShoppingNeeds('đổi sang balo', {
      query: 'giay',
      audience: 'nam',
      color: 'den',
      maxPrice: 500000,
    });
    expect(needs).toMatchObject({ query: 'balo', maxPrice: 500000 });
    expect(needs.color).toBeUndefined();
    expect(needs.audience).toBeUndefined();
  });
});
