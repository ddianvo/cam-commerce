import { calculateDiscount } from '../src/coupons/discount';
describe('integer VND coupon calculation', () => {
  it('rounds percentage down', () =>
    expect(calculateDiscount(100009, { kind: 'percent', value: 15, maxDiscount: 100000 })).toBe(
      15001,
    ));
  it('caps a percentage discount', () =>
    expect(calculateDiscount(1500000, { kind: 'percent', value: 10, maxDiscount: 100000 })).toBe(
      100000,
    ));
  it('subtracts a fixed discount', () =>
    expect(calculateDiscount(650000, { kind: 'fixed', value: 50000, maxDiscount: 50000 })).toBe(
      50000,
    ));
  it('never makes the order total negative', () =>
    expect(calculateDiscount(10000, { kind: 'fixed', value: 50000, maxDiscount: 50000 })).toBe(
      10000,
    ));
  it('rejects invalid integer input', () =>
    expect(() =>
      calculateDiscount(1.5, { kind: 'percent', value: 10, maxDiscount: 100 }),
    ).toThrow());
});
