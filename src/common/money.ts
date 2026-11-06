import { BadRequestException } from '@nestjs/common';
// VND is an integer amount. Never use floating point to sum a bill.
export const MAX_MONEY = 1_000_000_000_000;
export function checkedTotal(lines: { unitPrice: number; quantity: number }[]): number {
  let total = 0;
  for (const line of lines) {
    const amount = line.unitPrice * line.quantity;
    if (
      !Number.isSafeInteger(amount) ||
      amount < 0 ||
      !Number.isSafeInteger(total + amount) ||
      total + amount > MAX_MONEY
    ) {
      throw new BadRequestException('Tổng tiền vượt giới hạn cho phép');
    }
    total += amount;
  }
  return total;
}
export const moneyTransformer = {
  to: (value: number) => value,
  from: (value: string) => Number(value),
};
