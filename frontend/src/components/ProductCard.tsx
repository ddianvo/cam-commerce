import { ArrowUpRight, Heart, Plus, Package } from 'lucide-react';
import { imageFor, money } from '../api';
import type { Product } from '../types';
export function ProductImage({
  product,
  className = '',
}: {
  product: Product;
  className?: string;
}) {
  const src = imageFor(product);
  return src ? (
    <img className={className} src={src} alt={'Ảnh minh họa ' + product.name} loading="lazy" />
  ) : (
    <div className={'image-placeholder ' + className}>
      <Package size={60} />
    </div>
  );
}
export function ProductCard({
  product,
  favorite,
  onFavorite,
  onOpen,
  onAdd,
  busy,
}: {
  product: Product;
  favorite: boolean;
  onFavorite: () => void;
  onOpen: () => void;
  onAdd: () => void;
  busy: boolean;
}) {
  return (
    <article className="product-card">
      <div className="product-photo">
        <button className="photo-button" onClick={onOpen} aria-label={'Xem ' + product.name}>
          <ProductImage product={product} />
        </button>
        <span className="product-label">{product.category}</span>
        <button
          className={'favorite-button ' + (favorite ? 'is-favorite' : '')}
          onClick={onFavorite}
          aria-label={(favorite ? 'Bỏ yêu thích ' : 'Yêu thích ') + product.name}
          aria-pressed={favorite}
        >
          <Heart size={18} fill={favorite ? 'currentColor' : 'none'} />
        </button>
        <span className="photo-note">Ảnh minh họa</span>
      </div>
      <div className="product-info">
        <div className="stock-line">
          <span>
            <i />
            Còn {product.stock} sản phẩm
          </span>
          <ArrowUpRight size={16} />
        </div>
        <button className="product-name" onClick={onOpen}>
          {product.name}
        </button>
        <p>{product.description}</p>
        <div className="product-bottom">
          <strong>{money(product.price)}</strong>
          <button
            className="add-button"
            onClick={onAdd}
            disabled={busy || product.stock < 1}
            aria-label={'Thêm vào giỏ: ' + product.name}
          >
            <Plus size={19} />
            <span>Thêm vào giỏ</span>
          </button>
        </div>
      </div>
    </article>
  );
}
