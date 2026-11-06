import { useEffect, useState, type FormEvent } from 'react';
import { ArrowLeft, ArrowRight, Eye, Search } from 'lucide-react';
import { api, money } from '../api';
import type { Auth } from '../types';
import { Modal } from '../components/Modal';
import { orderStatusLabels, type ManagedOrder, type Page } from './types';
const nextStatus: Record<string, string> = { confirmed: 'shipped', shipped: 'delivered' };
export function AdminOrders({ auth, onChanged }: { auth: Auth; onChanged: () => void }) {
  const [data, setData] = useState<Page<ManagedOrder>>({ items: [], total: 0, page: 1, limit: 15 }),
    [page, setPage] = useState(1),
    [status, setStatus] = useState(''),
    [search, setSearch] = useState(''),
    [query, setQuery] = useState(''),
    [revision, setRevision] = useState(0),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    [selected, setSelected] = useState<ManagedOrder | null>(null),
    [busyId, setBusyId] = useState(''),
    [notice, setNotice] = useState('');
  useEffect(() => {
    const c = new AbortController();
    setLoading(true);
    setError('');
    api<Page<ManagedOrder>>(
      '/orders/manage?limit=15&page=' +
        page +
        (status ? '&status=' + status : '') +
        '&q=' +
        encodeURIComponent(query),
      { token: auth.accessToken, signal: c.signal },
    )
      .then(setData)
      .catch((e) => {
        if (e.name !== 'AbortError') setError(e.message);
      })
      .finally(() => {
        if (!c.signal.aborted) setLoading(false);
      });
    return () => c.abort();
  }, [auth.accessToken, page, status, query, revision]);
  async function advance(order: ManagedOrder) {
    const status = nextStatus[order.status];
    if (!status) return;
    setBusyId(order.id);
    setError('');
    try {
      await api('/orders/' + order.id + '/status', {
        method: 'PATCH',
        token: auth.accessToken,
        body: { status },
      });
      setRevision((n) => n + 1);
      onChanged();
      setNotice(
        'Đã cập nhật đơn #' +
          order.id.slice(0, 8).toUpperCase() +
          ' → ' +
          orderStatusLabels[status],
      );
      if (selected?.id === order.id) setSelected({ ...order, status });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyId('');
    }
  }
  function submit(e: FormEvent) {
    e.preventDefault();
    setQuery(search.trim());
    setPage(1);
  }
  const pages = Math.max(1, Math.ceil(data.total / data.limit));
  return (
    <>
      <div className="admin-page-title">
        <div>
          <span>VẬN HÀNH CỬA HÀNG</span>
          <h1>Quản lý đơn hàng</h1>
          <p>Theo dõi đơn đã xác nhận và cập nhật tiến trình giao hàng.</p>
        </div>
      </div>
      {notice && (
        <div className="admin-notice" role="status">
          {notice}
        </div>
      )}
      {error && (
        <p className="error-text" role="alert">
          {error}
        </p>
      )}
      <section className="admin-card">
        <div className="admin-table-tools">
          <form onSubmit={submit}>
            <Search size={17} />
            <input
              aria-label="Tìm đơn hàng quản trị"
              maxLength={100}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm mã đơn hoặc email khách hàng…"
            />
            <button>Tìm</button>
          </form>
          <select
            aria-label="Lọc trạng thái đơn hàng"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Tất cả trạng thái</option>
            {Object.entries(orderStatusLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="admin-table-scroll">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Đơn hàng</th>
                <th>Khách hàng</th>
                <th>Tổng tiền</th>
                <th>Trạng thái</th>
                <th className="right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="admin-table-empty">
                    Đang tải đơn hàng…
                  </td>
                </tr>
              ) : !data.items.length ? (
                <tr>
                  <td colSpan={5} className="admin-table-empty">
                    Chưa có đơn hàng phù hợp.
                  </td>
                </tr>
              ) : (
                data.items.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <div className="admin-order-id">
                        <strong>#{order.id.slice(0, 8).toUpperCase()}</strong>
                        <small>{new Date(order.createdAt).toLocaleString('vi-VN')}</small>
                      </div>
                    </td>
                    <td>
                      <div className="admin-order-id">
                        <strong>{order.customer.email}</strong>
                        <small>
                          {order.items.reduce((sum, i) => sum + i.quantity, 0)} sản phẩm
                        </small>
                      </div>
                    </td>
                    <td>
                      <div className="admin-order-id">
                        <strong className="admin-price">{money(order.total)}</strong>
                        {order.discount > 0 && (
                          <small>
                            Giảm {money(order.discount)} · {order.couponCode}
                          </small>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className={'admin-status ' + order.status}>
                        {orderStatusLabels[order.status]}
                      </span>
                    </td>
                    <td>
                      <div className="admin-row-actions">
                        <button
                          aria-label={'Xem đơn ' + order.id.slice(0, 8)}
                          title="Chi tiết đơn hàng"
                          onClick={() => setSelected(order)}
                        >
                          <Eye size={17} />
                        </button>
                        {nextStatus[order.status] && (
                          <button
                            className="admin-status-action"
                            disabled={!!busyId}
                            onClick={() => void advance(order)}
                          >
                            {busyId === order.id
                              ? 'Đang lưu…'
                              : order.status === 'confirmed'
                                ? 'Bắt đầu giao'
                                : 'Đã giao xong'}
                            <ArrowRight size={12} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="admin-pagination">
          <span>
            {data.total} đơn hàng · Trang {page}/{pages}
          </span>
          <div>
            <button
              className="outline"
              disabled={page <= 1 || loading}
              onClick={() => setPage((n) => n - 1)}
            >
              <ArrowLeft size={14} />
              Trước
            </button>
            <button
              className="outline"
              disabled={page >= pages || loading}
              onClick={() => setPage((n) => n + 1)}
            >
              Sau
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </section>
      {selected && (
        <Modal
          title={'Đơn hàng #' + selected.id.slice(0, 8).toUpperCase()}
          wide
          onClose={() => setSelected(null)}
        >
          <div className="admin-order-detail">
            <div className="admin-order-meta">
              <div>
                <small>KHÁCH HÀNG</small>
                <strong>{selected.customer.email}</strong>
              </div>
              <div>
                <small>TRẠNG THÁI</small>
                <span className={'admin-status ' + selected.status}>
                  {orderStatusLabels[selected.status]}
                </span>
              </div>
            </div>
            <p className="admin-order-full-id">Mã đơn đầy đủ: {selected.id}</p>
            {selected.items.map((item) => (
              <div className="order-line" key={item.productId}>
                <div>
                  <strong>{item.productName}</strong>
                  <small>
                    {item.quantity} × {money(item.unitPrice)}
                  </small>
                </div>
                <span>{money(item.quantity * item.unitPrice)}</span>
              </div>
            ))}
            <div className="admin-order-totals">
              <p>
                <span>Tiền sản phẩm</span>
                <strong>{money(selected.subtotal)}</strong>
              </p>
              {selected.discount > 0 && (
                <p>
                  <span>Giảm giá ({selected.couponCode})</span>
                  <strong>−{money(selected.discount)}</strong>
                </p>
              )}
              <p>
                <span>Thành tiền</span>
                <strong>{money(selected.total)}</strong>
              </p>
              <small>Đơn được xác nhận, không thể hiện đã thu tiền trực tuyến.</small>
            </div>
            {nextStatus[selected.status] && (
              <button
                className="primary"
                disabled={!!busyId}
                onClick={() => void advance(selected)}
              >
                {selected.status === 'confirmed' ? 'Chuyển sang đang giao' : 'Xác nhận đã giao'}
                <ArrowRight size={16} />
              </button>
            )}
          </div>
        </Modal>
      )}
    </>
  );
}
