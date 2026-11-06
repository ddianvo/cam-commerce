import { checkedTotal, MAX_MONEY } from '../src/common/money';
describe('VND totals', () => {
  it('sums integer amounts exactly', () =>
    expect(
      checkedTotal([
        { unitPrice: 650000, quantity: 2 },
        { unitPrice: 390000, quantity: 1 },
      ]),
    ).toBe(1690000));
  it('rejects totals outside the business limit', () =>
    expect(() => checkedTotal([{ unitPrice: MAX_MONEY, quantity: 2 }])).toThrow());
  it('rejects fractional or unsafe totals', () =>
    expect(() => checkedTotal([{ unitPrice: 1.2, quantity: 1 }])).toThrow());
});
