import { normalizeText } from '../products/product-search';

export interface ShoppingNeeds {
  query?: string;
  audience?: 'nam' | 'nu';
  color?: string;
  minPrice?: number;
  maxPrice?: number;
  cheapest?: boolean;
}

const colors = 'xanh duong|xanh la|xanh|den|trang|xam|nau|hong|do|vang|cam|tim|be';
const namedColor = new RegExp('\\bmau (' + colors + ')\\b');
const standaloneColor = new RegExp('^(' + colors + ')$');
const amount = String.raw`(\d{1,3}(?:[.,]\d{3})+|\d+(?:[.,]\d+)?)\s*(trieu|tr|nghin|ngan|k|vnd|dong|d)?\b`;
const range = new RegExp(
  String.raw`\b(?:tu\s+)?` + amount + String.raw`\s*(?:den|toi|-)\s*` + amount,
);
const single = new RegExp(
  String.raw`\b(?:(tu|tren|hon|duoi|toi da|toi thieu|khong qua|khoang|tam|ngan sach(?: khoang| tam)?|co|gia)\s+)?` +
    amount,
  'g',
);
const filler =
  /\b(?:toi muon|minh muon|em muon|cho minh|cho toi|cho em|tu van|goi y|tim mua|dang can|dang tim|shop co|co khong|phu hop|giup minh|giup toi|giup em|cam on|xin chao|xin|chao|toi|minh|em|muon|tim|can|mua|voi|nhe|nha|a|oi|ua|thi sao|loai nao|loai|mau nao|san pham|re nhat|re hon|gia re|re)\b/g;

function vnd(raw: string, unit?: string): number | undefined {
  const scale = ['trieu', 'tr'].includes(unit ?? '')
    ? 1_000_000
    : ['nghin', 'ngan', 'k'].includes(unit ?? '')
      ? 1_000
      : 1;
  const number =
    /^\d{1,3}(?:[.,]\d{3})+$/.test(raw) && scale === 1
      ? Number(raw.replace(/[.,]/g, ''))
      : Number(raw.replace(',', '.')) * scale;
  if ((!unit && number < 1000) || !Number.isInteger(number) || number > 1_000_000_000)
    return undefined;
  return number;
}

export function readShoppingNeeds(message: string, previous: ShoppingNeeds) {
  // Keep separators until the price has been parsed. Product matching uses normalized text.
  let text = message
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/đ/g, 'd')
    .replace(/[–—]/g, '-')
    .replace(/[^a-z0-9.,\s-]/g, ' ');
  const bounds = text.match(range);
  let price: Pick<ShoppingNeeds, 'minPrice' | 'maxPrice'> | undefined;
  if (bounds) {
    price = {
      minPrice: vnd(bounds[1], bounds[2] ?? bounds[4]),
      maxPrice: vnd(bounds[3], bounds[4]),
    };
    if (price.minPrice === undefined || price.maxPrice === undefined)
      return { needs: previous, invalidBudget: true };
    text = text.replace(bounds[0], ' ');
  } else {
    const match = [...text.matchAll(single)].find(
      (item) => item[1] || item[3] || /^\d{1,3}(?:[.,]\d{3})+$|^\d{5,}$/.test(item[2]),
    );
    if (match) {
      const value = vnd(match[2], match[3]);
      if (value === undefined) return { needs: previous, invalidBudget: true };
      const lower = ['tu', 'tren', 'hon', 'toi thieu'].includes(match[1]);
      price = lower
        ? { minPrice: value + Number(match[1] === 'tren' || match[1] === 'hon') }
        : { maxPrice: value - Number(match[1] === 'duoi') };
      text = text.replace(match[0], ' ');
    }
  }
  if (
    price?.minPrice !== undefined &&
    price.maxPrice !== undefined &&
    price.minPrice > price.maxPrice
  )
    return { needs: previous, invalidBudget: true };

  text = normalizeText(text).replace(/\b(?:doi sang|chuyen sang|thay bang)\b/g, ' ');
  const cheapest = /\b(?:re nhat|gia re)\b/.test(text);
  const explicitColor = text.match(namedColor)?.[1];
  text = text.replace(namedColor, ' ').replace(filler, ' ').replace(/\s+/g, ' ').trim();
  const color = explicitColor ?? text.match(standaloneColor)?.[1];
  if (text === color) text = '';
  const audience = text.match(/\b(nam|nu)\b/)?.[1] as ShoppingNeeds['audience'];
  text = text
    .replace(/\b(?:danh cho|cho)?\s*(?:nam|nu)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return {
    needs: {
      ...(text && text !== previous.query
        ? { minPrice: previous.minPrice, maxPrice: previous.maxPrice, query: text }
        : previous),
      ...(price && { minPrice: price.minPrice, maxPrice: price.maxPrice }),
      ...(audience && { audience }),
      ...(color && { color }),
      ...(cheapest && { cheapest }),
    },
    invalidBudget: false,
  };
}
