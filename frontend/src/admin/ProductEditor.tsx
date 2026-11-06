import { useState, type FormEvent } from 'react';
import { ImagePlus, Save } from 'lucide-react';
import type { Auth, Product } from '../types';
import { api, imageFor } from '../api';
import { Modal } from '../components/Modal';
const library: Record<string, string> = {
  black: 'Giày đen',
  white: 'Giày trắng',
  backpack: 'Balo',
  tshirt: 'Áo thun',
  hoodie: 'Hoodie',
  shirt: 'Sơ mi',
  dress: 'Váy',
  headphones: 'Tai nghe',
  keyboard: 'Bàn phím',
  mouse: 'Chuột',
  speaker: 'Loa',
  bottle: 'Bình nước',
  mug: 'Ly sứ',
  lamp: 'Đèn bàn',
  pillow: 'Gối',
  skincare: 'Chăm sóc da',
  cosmetics: 'Trang điểm',
  fitness: 'Thể thao',
  notebook: 'Sổ tay',
  pen: 'Bút',
  watch: 'Đồng hồ',
  sunglasses: 'Kính',
  wallet: 'Ví',
  cap: 'Mũ',
};
function initial(product: Product | null) {
  return {
    name: product?.name ?? '',
    description: product?.description ?? '',
    price: String(product?.price ?? ''),
    stock: String(product?.stock ?? ''),
    category: product?.category ?? '',
    tags: product?.tags.join(', ') ?? '',
    imageUrl: product ? (imageFor(product) ?? '') : '',
    isActive: product?.isActive ?? true,
  };
}
export function ProductEditor({
  product,
  auth,
  categories,
  onClose,
  onSaved,
}: {
  product: Product | null;
  auth: Auth;
  categories: string[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState(() => initial(product)),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  function update(key: keyof typeof form, value: string | boolean) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }
  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    const normalize = (value: typeof form) => ({
      name: value.name.trim(),
      description: value.description.trim(),
      price: Number(value.price),
      stock: Number(value.stock),
      category: value.category.trim(),
      tags: [
        ...new Set(
          value.tags
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean),
        ),
      ],
      imageUrl: value.imageUrl || null,
      isActive: value.isActive,
    });
    const next = normalize(form),
      previous = normalize(initial(product));
    if (!next.name || !next.description || !next.category) {
      setError('Vui lòng nhập tên, mô tả và danh mục hợp lệ.');
      return;
    }
    if (next.tags.length > 30 || next.tags.some((t) => t.length > 50)) {
      setError('Tối đa 30 tags, mỗi tag không quá 50 ký tự.');
      return;
    }
    const body: Record<string, unknown> = {};
    for (const key of Object.keys(next) as (keyof typeof next)[]) {
      if (key === 'isActive' && auth.user.role !== 'admin') continue;
      if (!product || JSON.stringify(next[key]) !== JSON.stringify(previous[key]))
        body[key] = next[key];
    }
    if (product && !Object.keys(body).length) {
      onClose();
      return;
    }
    setBusy(true);
    try {
      await api('/products' + (product ? '/' + product.id : ''), {
        method: product ? 'PATCH' : 'POST',
        token: auth.accessToken,
        body,
      });
      onSaved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={product ? 'Chỉnh sửa sản phẩm' : 'Thêm sản phẩm mới'}
      wide
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <form className="admin-editor" onSubmit={submit}>
        <div className="admin-editor-grid">
          <div className="admin-editor-fields">
            <label>
              Tên sản phẩm <span>*</span>
              <input
                required
                maxLength={200}
                value={form.name}
                onChange={(e) => update('name', e.target.value)}
                placeholder="Ví dụ: Balo Urban 20L"
              />
            </label>
            <div className="admin-form-row">
              <label>
                Giá bán (VND) <span>*</span>
                <input
                  type="number"
                  min={0}
                  max={1000000000}
                  step={1}
                  required
                  value={form.price}
                  onChange={(e) => update('price', e.target.value)}
                  placeholder="390000"
                />
              </label>
              <label>
                Tồn kho <span>*</span>
                <input
                  type="number"
                  min={0}
                  max={1000000000}
                  step={1}
                  required
                  value={form.stock}
                  onChange={(e) => update('stock', e.target.value)}
                  placeholder="20"
                />
              </label>
            </div>
            <label>
              Danh mục <span>*</span>
              <input
                required
                list="admin-category-options"
                maxLength={100}
                value={form.category}
                onChange={(e) => update('category', e.target.value)}
                placeholder="Chọn hoặc nhập danh mục mới"
              />
              <datalist id="admin-category-options">
                {categories.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </label>
            <label>
              Mô tả <span>*</span>
              <textarea
                required
                maxLength={5000}
                rows={4}
                value={form.description}
                onChange={(e) => update('description', e.target.value)}
                placeholder="Chất liệu, kích thước, công dụng…"
              />
            </label>
            <label>
              Tags hỗ trợ tìm kiếm
              <input
                value={form.tags}
                maxLength={1550}
                onChange={(e) => update('tags', e.target.value)}
                placeholder="balo, laptop, đi làm"
              />
              <small>Phân cách bằng dấu phẩy. Tối đa 30 tags.</small>
            </label>
          </div>
          <aside className="admin-image-editor">
            <div>
              {form.imageUrl ? (
                <img src={form.imageUrl} alt="Ảnh minh họa đã chọn" />
              ) : (
                <ImagePlus size={45} />
              )}
            </div>
            <label>
              Ảnh minh họa (thư viện)
              <select value={form.imageUrl} onChange={(e) => update('imageUrl', e.target.value)}>
                <option value="">Dùng ảnh mặc định (nếu có)</option>
                {Object.entries(library).map(([key, label]) => (
                  <option key={key} value={'/images/' + key + '.jpg'}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <p>Chọn từ thư viện ảnh minh họa có sẵn.</p>
            {auth.user.role === 'admin' ? (
              <label className="admin-check">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => update('isActive', e.target.checked)}
                />
                Đang mở bán
              </label>
            ) : (
              <p>Trạng thái mở/ngừng bán do Admin quản lý.</p>
            )}
          </aside>
        </div>
        {error && (
          <p className="error-text" role="alert">
            {error}
          </p>
        )}
        <div className="admin-form-actions">
          <button type="button" className="outline" disabled={busy} onClick={onClose}>
            Hủy bỏ
          </button>
          <button className="primary" disabled={busy}>
            <Save size={16} />
            {busy ? 'Đang lưu…' : product ? 'Lưu thay đổi' : 'Thêm sản phẩm'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
