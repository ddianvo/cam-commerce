import catalogImages from './product-images.json';
import type { Auth } from './types';
const SESSION_KEY = 'cam-auth';
export function readAuth(): Auth | null {
  try {
    const value = JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null') as Auth | null;
    return value && value.expiresAt > Date.now() ? value : null;
  } catch {
    return null;
  }
}
export function saveAuth(auth: Auth | null) {
  if (auth) sessionStorage.setItem(SESSION_KEY, JSON.stringify(auth));
  else sessionStorage.removeItem(SESSION_KEY);
}
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function api<T>(
  path: string,
  options: { method?: string; body?: unknown; token?: string; signal?: AbortSignal } = {},
): Promise<T> {
  const response = await fetch('/api' + path, {
    method: options.method ?? 'GET',
    signal: options.signal,
    headers: {
      ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(options.token ? { Authorization: 'Bearer ' + options.token } : {}),
    },
    ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401 && options.token)
      window.dispatchEvent(new Event('cam-session-expired'));
    const message = data?.message;
    throw new ApiError(
      response.status,
      Array.isArray(message)
        ? message.join('. ')
        : typeof message === 'string'
          ? message
          : 'Không thể kết nối dịch vụ. Vui lòng thử lại.',
    );
  }
  return data as T;
}
export const money = (amount: number) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);
export function imageFor(product: { id: string; category?: string; imageUrl?: string | null }) {
  if (product.imageUrl) return product.imageUrl;
  const images: Record<string, string> = {
    ...catalogImages,
    '10000000-0000-4000-8000-000000000001': 'black',
    '10000000-0000-4000-8000-000000000002': 'white',
    '10000000-0000-4000-8000-000000000003': 'backpack',
  };
  return images[product.id] ? '/images/' + images[product.id] + '.jpg' : null;
}
