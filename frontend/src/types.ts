export interface Product {
  id: string;
  name: string;
  description: string;
  imageUrl?: string | null;
  price: number;
  stock: number;
  category: string;
  tags: string[];
  isActive: boolean;
  createdAt: string;
}
export interface Auth {
  accessToken: string;
  expiresAt: number;
  user: { id: string; email: string; role: string };
}
export interface Cart {
  items: { id: string; productId: string; quantity: number; product: Product }[];
  total: number;
}
export interface Coupon {
  code: string;
  description: string;
  kind: 'percent' | 'fixed';
  value: number;
  minSubtotal: number;
  maxDiscount: number;
  perUserLimit: number;
  expiresAt: string;
}
export interface CouponQuote {
  code: string;
  description: string;
  subtotal: number;
  discount: number;
  total: number;
}
export interface Order {
  subtotal: number;
  discount: number;
  couponCode: string | null;
  id: string;
  total: number;
  status: string;
  createdAt: string;
  items: { productId: string; productName: string; unitPrice: number; quantity: number }[];
}
export interface ChatReply {
  text: string;
  productIds: string[];
  products: Product[];
  sessionId: string;
}
export interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
  products?: Product[];
  error?: boolean;
}
