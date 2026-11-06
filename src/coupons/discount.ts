// Integer VND. Percentage discounts round down; never exceed subtotal or the code cap.
export function calculateDiscount(
  subtotal: number,
  coupon: { kind: 'percent' | 'fixed'; value: number; maxDiscount: number },
): number {
  if (
    !Number.isSafeInteger(subtotal) ||
    subtotal < 0 ||
    !Number.isInteger(coupon.value) ||
    coupon.value <= 0 ||
    !Number.isSafeInteger(coupon.maxDiscount) ||
    coupon.maxDiscount < 0 ||
    (coupon.kind === 'percent' && coupon.value > 100)
  )
    throw new Error('Invalid discount configuration');
  const amount =
    coupon.kind === 'percent' ? Math.floor((subtotal * coupon.value) / 100) : coupon.value;
  return Math.min(subtotal, coupon.maxDiscount, amount);
}
