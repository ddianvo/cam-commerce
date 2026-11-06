import { useEffect, useState } from 'react';
import { ArrowUpRight, Boxes, CircleCheck, Package, ShoppingBag, Truck } from 'lucide-react';
import { api, money } from '../api';
import type { Auth } from '../types';
import { orderStatusLabels, type ManagedOrder, type Overview, type Page } from './types';
export function AdminOverview({
  auth,
  revision,
  onNavigate,
}: {
  auth: Auth;
  revision: number;
  onNavigate: (tab: 'products' | 'orders') => void;
}) {
  const [data, setData] = useState<Overview | null>(null),
    [recent, setRecent] = useState<ManagedOrder[]>([]),
    [error, setError] = useState(''),
    [loading, setLoading] = useState(true);
  useEffect(() => {
    const c = new AbortController();
    setLoading(true);
    setError('');
    Promise.all([
      api<Overview>('/admin/overview', { token: auth.accessToken, signal: c.signal }),
      api<Page<ManagedOrder>>('/orders/manage?limit=5', {
        token: auth.accessToken,
        signal: c.signal,
      }),
    ])
      .then(([stats, orders]) => {
        setData(stats);
        setRecent(orders.items);
      })
      .catch((e) => {
        if (e.name !== 'AbortError') setError(e.message);
      })
      .finally(() => {
        if (!c.signal.aborted) setLoading(false);
      });
    return () => c.abort();
  }, [auth.accessToken, revision]);
  const value = data
    ? new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0,
      }).format(BigInt(data.orderValue))
    : '—';
  return (
    <>
      <div className="admin-page-title">
        <div>
          <span>CHÀO MỪNG BẠN TRỞ LẠI</span>
          <h1>Tổng quan cửa hàng</h1>
          <p>Mọi sản phẩm và đơn hàng, trong một không gian quản lý.</p>
        </div>
        <span className="admin-today">
          {new Date().toLocaleDateString('vi-VN', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        </span>
      </div>
      {error && (
        <p className="error-text" role="alert">
          {error}
        </p>
      )}
      <div className="admin-stats">
        {[
          {
            title: 'Sản phẩm',
            value: data?.totalProducts,
            detail: (data?.activeProducts ?? 0) + ' đang mở bán',
            icon: Boxes,
            tab: 'products' as const,
          },
          {
            title: 'Đơn hàng',
            value: data?.totalOrders,
            detail: (data?.confirmed ?? 0) + ' đơn chờ giao',
            icon: ShoppingBag,
            tab: 'orders' as const,
          },
          {
            title: 'Sắp hết hàng',
            value: data?.lowStock,
            detail: 'Tồn kho còn 5 sản phẩm trở xuống',
            icon: Package,
            tab: 'products' as const,
          },
        ].map((stat) => (
          <button className="admin-stat" key={stat.title} onClick={() => onNavigate(stat.tab)}>
            <span>
              <stat.icon size={22} />
              <ArrowUpRight size={16} />
            </span>
            <small>{stat.title}</small>
            <strong>{loading ? '—' : (stat.value ?? '—')}</strong>
            <p>{loading ? 'Đang tải dữ liệu…' : stat.detail}</p>
          </button>
        ))}
        <div className="admin-stat admin-stat-value">
          <span>
            <CircleCheck size={22} />
          </span>
          <small>Giá trị đơn hàng</small>
          <strong>{loading ? '—' : value}</strong>
          <p>Tổng giá trị đặt hàng, chưa xác nhận thu tiền</p>
        </div>
      </div>
      <div className="admin-overview-grid">
        <section className="admin-card">
          <div className="admin-section-title">
            <h2>Đơn hàng gần đây</h2>
            <button onClick={() => onNavigate('orders')}>
              Xem tất cả
              <ArrowUpRight size={15} />
            </button>
          </div>
          <div className="admin-table-scroll">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Đơn hàng / khách hàng</th>
                  <th>Thành tiền</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={3} className="admin-table-empty">
                      Đang tải…
                    </td>
                  </tr>
                ) : !recent.length ? (
                  <tr>
                    <td colSpan={3} className="admin-table-empty">
                      Chưa có đơn hàng nào.
                    </td>
                  </tr>
                ) : (
                  recent.map((order) => (
                    <tr key={order.id}>
                      <td>
                        <div className="admin-order-id">
                          <strong>#{order.id.slice(0, 8).toUpperCase()}</strong>
                          <small>{order.customer.email}</small>
                        </div>
                      </td>
                      <td className="admin-price">{money(order.total)}</td>
                      <td>
                        <span className={'admin-status ' + order.status}>
                          {orderStatusLabels[order.status]}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
        <aside className="admin-card admin-workflow">
          <span>
            <Truck size={24} />
          </span>
          <h2>Tiến trình đơn hàng</h2>
          {[
            { label: 'Đã xác nhận', value: data?.confirmed, className: 'confirmed' },
            { label: 'Đang giao', value: data?.shipped, className: 'shipped' },
            { label: 'Đã giao', value: data?.delivered, className: 'delivered' },
          ].map((item) => (
            <div key={item.className}>
              <span>
                <i className={item.className} />
                {item.label}
              </span>
              <strong>{loading ? '—' : (item.value ?? '—')}</strong>
            </div>
          ))}
          <p>Cập nhật trạng thái khi đơn chuyển sang bước giao hàng tiếp theo.</p>
          <button className="outline" onClick={() => onNavigate('orders')}>
            Quản lý đơn hàng
            <ArrowUpRight size={14} />
          </button>
        </aside>
      </div>
    </>
  );
}
