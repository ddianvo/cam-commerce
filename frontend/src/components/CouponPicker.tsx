import { TicketPercent, X, Tag } from 'lucide-react';
import type { Coupon, CouponQuote } from '../types';
import { money } from '../api';
export function CouponPicker({
  input,
  onInput,
  coupons,
  quote,
  busy,
  disabled,
  error,
  onApply,
  onRemove,
}: {
  input: string;
  onInput: (value: string) => void;
  coupons: Coupon[];
  quote: CouponQuote | null;
  busy: boolean;
  disabled: boolean;
  error: string;
  onApply: (code: string) => void;
  onRemove: () => void;
}) {
  return (
    <div className="coupon-picker">
      <h3>
        <TicketPercent size={18} />
        Mã giảm giá
      </h3>
      <div className="coupon-entry">
        <input
          aria-label="Mã giảm giá"
          placeholder="Nhập mã ưu đãi của bạn"
          maxLength={32}
          value={input}
          disabled={busy || disabled}
          onChange={(e) => onInput(e.target.value.toUpperCase())}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              if (input.trim() && !busy && !disabled) onApply(input);
            }
          }}
        />
        <button
          type="button"
          disabled={busy || disabled || !input.trim()}
          onClick={() => onApply(input)}
        >
          {busy ? 'Đang kiểm tra…' : 'Áp dụng'}
        </button>
      </div>
      {error && (
        <p className="coupon-error" role="alert">
          {error}
        </p>
      )}
      {quote ? (
        <div className="applied-coupon">
          <Tag size={16} />
          <span>
            <strong>{quote.code}</strong> · Đã giảm {money(quote.discount)}
          </span>
          <button
            type="button"
            aria-label="Bỏ mã giảm giá"
            onClick={onRemove}
            disabled={disabled || busy}
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        <div className="coupon-suggestions">
          {coupons.map((c) => (
            <button
              key={c.code}
              type="button"
              title={c.description}
              disabled={busy || disabled}
              onClick={() => onApply(c.code)}
            >
              <Tag size={12} />
              {c.code}
            </button>
          ))}
        </div>
      )}
      <small>Mỗi đơn dùng 1 mã. Điều kiện và lượt dùng được kiểm tra lại khi đặt hàng.</small>
    </div>
  );
}
export function CouponShelf({
  coupons,
  onChoose,
}: {
  coupons: Coupon[];
  onChoose: (code: string) => void;
}) {
  if (!coupons.length) return null;
  return (
    <section className="coupon-shelf" aria-label="Mã ưu đãi">
      <div className="coupon-shelf-title">
        <TicketPercent size={22} />
        <div>
          <strong>Thêm ưu đãi, thêm vui</strong>
          <small>Chọn mã cho giỏ hàng của bạn</small>
        </div>
      </div>
      {coupons.map((c) => (
        <article key={c.code}>
          <span className="voucher-cut" />
          <div>
            <strong>{c.code}</strong>
            <p>{c.description}</p>
            <small>
              {c.perUserLimit} lượt/người · đến {new Date(c.expiresAt).toLocaleDateString('vi-VN')}
            </small>
          </div>
          <button type="button" onClick={() => onChoose(c.code)}>
            Dùng mã
          </button>
        </article>
      ))}
    </section>
  );
}
