import { buildSearchText, normalizeText, searchTokens } from '../src/products/product-search';
describe('Vietnamese keyword matching', () => {
  it('normalizes diacritics and đ', () => expect(normalizeText('GIÀY ĐỎ Nữ')).toBe('giay do nu'));
  it('bounds and deduplicates query tokens', () =>
    expect(searchTokens('giày giày % _ đỏ')).toEqual(['giay', 'do']));
  it('includes searchable tags', () =>
    expect(
      buildSearchText({ name: 'Urban', description: 'Đen', category: 'Giày', tags: ['sneaker'] }),
    ).toContain('sneaker'));
});
