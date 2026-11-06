import { useEffect, useState, type FormEvent } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Pencil,
  Plus,
  Search,
  Trash2,
  RotateCcw,
  Package,
} from 'lucide-react';
import { api, money } from '../api';
import type { Auth, Product } from '../types';
import type { Page } from './types';
import { ProductImage } from '../components/ProductCard';
import { Modal } from '../components/Modal';
import { ProductEditor } from './ProductEditor';
export function AdminProducts({ auth, onChanged }: { auth: Auth; onChanged: () => void }) {
  const [data, setData] = useState<Page<Product>>({ items: [], total: 0, page: 1, limit: 12 }),
    [page, setPage] = useState(1),
    [status, setStatus] = useState('all'),
    [search, setSearch] = useState(''),
    [query, setQuery] = useState(''),
    [revision, setRevision] = useState(0),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    [editing, setEditing] = useState<Product | null | undefined>(undefined),
    [removing, setRemoving] = useState<Product | null>(null),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(''),
    [categories, setCategories] = useState<string[]>([]);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    api<Page<Product>>(
      '/products/manage?limit=12&page=' +
        page +
        '&status=' +
        status +
        '&q=' +
        encodeURIComponent(query),
      { token: auth.accessToken, signal: controller.signal },
    )
      .then(setData)
      .catch((e) => {
        if (e.name !== 'AbortError') setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [auth.accessToken, page, status, query, revision]);
  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const first = await api<Page<Product>>('/products/manage?limit=50', {
          token: auth.accessToken,
          signal: controller.signal,
        });
        const rows = [...first.items];
        for (let i = 2; rows.length < first.total; i++) {
          const next = await api<Page<Product>>('/products/manage?limit=50&page=' + i, {
            token: auth.accessToken,
            signal: controller.signal,
          });
          if (!next.items.length) break;
          rows.push(...next.items);
        }
        setCategories(
          [...new Set(rows.map((p) => p.category))].sort((a, b) => a.localeCompare(b, 'vi')),
        );
      } catch {}
    })();
    return () => controller.abort();
  }, [auth.accessToken, revision]);
  function refresh(message: string) {
    setNotice(message);
    setRevision((n) => n + 1);
    onChanged();
  }
  async function remove() {
    if (!removing) return;
    setBusy(true);
    try {
      await api('/products/' + removing.id, { method: 'DELETE', token: auth.accessToken });
      setRemoving(null);
      if (data.items.length === 1 && page > 1) setPage((n) => n - 1);
      refresh('Đã ngừng bán sản phẩm. Lịch sử đơn hàng được giữ nguyên.');
    } catch (e) {
      setError((e as Error).message);
      setRemoving(null);
    } finally {
      setBusy(false);
    }
  }
  async function restore(product: Product) {
    setBusy(true);
    setError('');
    try {
      await api('/products/' + product.id, {
        method: 'PATCH',
        token: auth.accessToken,
        body: { isActive: true },
      });
      refresh('Đã mở bán lại sản phẩm.');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
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
          <span>CATALOG CỬA HÀNG</span>
          <h1>Quản lý sản phẩm</h1>
          <p>Thêm lựa chọn mới, cập nhật giá và quản lý tồn kho.</p>
        </div>
        <button className="primary" onClick={() => setEditing(null)}>
          <Plus size={17} />
          Thêm sản phẩm
        </button>
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
              aria-label="Tìm sản phẩm quản trị"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              maxLength={200}
              placeholder="Tìm theo tên, mô tả hoặc tags…"
            />
            <button>Tìm</button>
          </form>
          <select
            aria-label="Lọc trạng thái sản phẩm"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="active">Đang mở bán</option>
            <option value="inactive">Đã ngừng bán</option>
          </select>
        </div>
        <div className="admin-table-scroll">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Sản phẩm</th>
                <th>Danh mục</th>
                <th>Giá bán</th>
                <th>Tồn kho</th>
                <th>Trạng thái</th>
                <th className="right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="admin-table-empty">
                    Đang tải sản phẩm…
                  </td>
                </tr>
              ) : !data.items.length ? (
                <tr>
                  <td colSpan={6} className="admin-table-empty">
                    <Package size={30} />
                    <p>Chưa có sản phẩm phù hợp.</p>
                  </td>
                </tr>
              ) : (
                data.items.map((product) => (
                  <tr key={product.id}>
                    <td>
                      <div className="admin-product-cell">
                        <div>
                          <ProductImage product={product} />
                        </div>
                        <span>
                          <strong>{product.name}</strong>
                          <small>
                            #{product.id.slice(0, 8)}…{product.id.slice(-4)}
                          </small>
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className="admin-category-label">{product.category}</span>
                    </td>
                    <td className="admin-price">{money(product.price)}</td>
                    <td>
                      <span className={product.stock <= 5 ? 'admin-low-stock' : ''}>
                        {product.stock}
                      </span>
                    </td>
                    <td>
                      <span
                        className={'admin-status ' + (product.isActive ? 'active' : 'inactive')}
                      >
                        {product.isActive ? 'Đang bán' : 'Ngừng bán'}
                      </span>
                    </td>
                    <td>
                      <div className="admin-row-actions">
                        <button
                          aria-label={'Sửa ' + product.name}
                          title="Chỉnh sửa"
                          onClick={() => setEditing(product)}
                        >
                          <Pencil size={16} />
                        </button>
                        {auth.user.role === 'admin' &&
                          (product.isActive ? (
                            <button
                              className="danger"
                              title="Xóa khỏi gian hàng / ngừng bán"
                              aria-label={'Ngừng bán ' + product.name}
                              disabled={busy}
                              onClick={() => setRemoving(product)}
                            >
                              <Trash2 size={16} />
                            </button>
                          ) : (
                            <button
                              title="Mở bán lại"
                              aria-label={'Mở bán lại ' + product.name}
                              disabled={busy}
                              onClick={() => void restore(product)}
                            >
                              <RotateCcw size={16} />
                            </button>
                          ))}
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
            {data.total} sản phẩm · Trang {page}/{pages}
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
      {editing !== undefined && (
        <ProductEditor
          key={editing?.id ?? 'new'}
          product={editing}
          auth={auth}
          categories={categories}
          onClose={() => setEditing(undefined)}
          onSaved={() => {
            setEditing(undefined);
            refresh('Đã lưu sản phẩm thành công.');
          }}
        />
      )}
      {removing && (
        <Modal
          title="Ngừng bán sản phẩm?"
          onClose={() => {
            if (!busy) setRemoving(null);
          }}
        >
          <div className="admin-confirm">
            <span>
              <Trash2 size={25} />
            </span>
            <h3>{removing.name}</h3>
            <p>
              Sản phẩm sẽ được ẩn khỏi gian hàng. Dữ liệu và lịch sử đơn hàng được giữ nguyên; Admin
              có thể mở bán lại bất kỳ lúc nào.
            </p>
            <div>
              <button className="outline" disabled={busy} onClick={() => setRemoving(null)}>
                Giữ lại
              </button>
              <button className="admin-danger-button" disabled={busy} onClick={() => void remove()}>
                {busy ? 'Đang xử lý…' : 'Xác nhận ngừng bán'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
