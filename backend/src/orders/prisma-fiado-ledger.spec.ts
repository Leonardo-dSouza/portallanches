import type { PrismaClient } from '../generated/prisma/client.js';
import { lastPaidNights } from './prisma-fiado-ledger.js';

interface PaymentRow {
  orderId: number;
  closing: { businessDate: Date };
}

/** A tabela de recebimentos já na ordem de data que a consulta pede. */
class FakePaymentsTable {
  constructor(private readonly rows: PaymentRow[]) {}

  async findMany(): Promise<PaymentRow[]> {
    return this.rows;
  }
}

const payment = (orderId: number, date: string): PaymentRow => ({
  orderId,
  closing: { businessDate: new Date(`${date}T00:00:00Z`) },
});

function prismaWith(rows: PaymentRow[]): PrismaClient {
  const fiadoPayment = new FakePaymentsTable(rows);
  return { fiadoPayment } as unknown as PrismaClient;
}

describe('lastPaidNights', () => {
  it('fica a noite mais nova de cada pedido', async () => {
    const nights = await lastPaidNights(
      prismaWith([
        payment(12, '2026-10-30'),
        payment(13, '2026-10-31'),
        payment(12, '2026-11-01'),
      ]),
      [12, 13],
    );
    expect(nights.get(12)).toBe('2026-11-01');
    expect(nights.get(13)).toBe('2026-10-31');
  });

  it('pedido sem recebimento não entra', async () => {
    const nights = await lastPaidNights(prismaWith([]), [12]);
    expect(nights.has(12)).toBe(false);
  });
});
