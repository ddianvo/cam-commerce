export function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}
export function searchTokens(query: string): string[] {
  return [
    ...new Set(
      normalizeText(query)
        .split(/\s+/)
        .filter((t) => t.length >= 2),
    ),
  ].slice(0, 12);
}
export function buildSearchText(product: {
  name: string;
  description: string;
  category: string;
  tags: string[];
}): string {
  return normalizeText(
    [product.name, product.description, product.category, ...product.tags].join(' '),
  );
}
