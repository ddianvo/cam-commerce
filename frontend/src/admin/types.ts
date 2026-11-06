import type { Order } from '../types';
export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}
export interface Overview {
  totalProducts: number;
  activeProducts: number;
  inactiveProducts: number;
  lowStock: number;
  totalOrders: number;
  confirmed: number;
  shipped: number;
  delivered: number;
  orderValue: string;
}
export interface ManagedOrder extends Order {
  customer: { id: string; email: string };
}
export const orderStatusLabels: Record<string, string> = {
  confirmed: 'Đã xác nhận',
  shipped: 'Đang giao',
  delivered: 'Đã giao',
};
