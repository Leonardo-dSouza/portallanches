import { ConflictException } from '@nestjs/common';
import {
  assertNoFiadoPayment,
  fiadoBalances,
  remainingCents,
  withFiado,
  type FiadoLedgerRow,
} from './order-fiado.js';
import type { OrderRecord } from './order-repository.js';

const row = (fields: Partial<FiadoLedgerRow>): FiadoLedgerRow => ({
  orderId: 1,
  customerId: 7,
  amount: '47.00',
  paid: '0.00',
  canceled: false,
  ...fields,
});

/** O repositório só com o razão do fiado: devolve as linhas dos pedidos pedidos e dos clientes. */
class FakeFiadoLedger {
  constructor(private readonly rows: FiadoLedgerRow[]) {}
  readonly asked: number[][] = [];

  async listFiadoLedger(orderIds: number[]): Promise<FiadoLedgerRow[]> {
    this.asked.push(orderIds);
    return this.rows;
  }
}

const order = (id: number, fiadoDueDate: string | null = null) =>
  ({ id, dayNumber: id + 10, fiadoDueDate }) as OrderRecord;

// Fiado (pedido do usuário, 2026-10-25): o que falta é calculado, sem saldo gravado.
describe('order-fiado', () => {
  it('o que falta é o valor menos o recebido; cancelado não deve nada', () => {
    expect(remainingCents(row({ paid: '20.00' }))).toBe(2700);
    expect(remainingCents(row({ paid: '47.00' }))).toBe(0);
    expect(remainingCents(row({ canceled: true }))).toBe(0);
  });

  it('cada pedido com o pago, o que falta e o total do cliente em aberto', () => {
    const balances = fiadoBalances([
      row({ orderId: 1, paid: '20.00' }),
      row({ orderId: 2, amount: '10.00' }),
      row({ orderId: 3, customerId: 8, amount: '5.00' }),
    ]);
    expect(balances.get(1)).toEqual({
      paidTotal: '20.00',
      remaining: '27.00',
      customerOpenTotal: '37.00',
    });
    expect(balances.get(3)?.customerOpenTotal).toBe('5.00');
  });

  it('anexa o bloco fiado (com a previsão) só nos pedidos fiado', async () => {
    const ledger = new FakeFiadoLedger([row({ orderId: 1, paid: '7.00' })]);
    const [fiado, plain] = await withFiado(ledger, [
      order(1, '2026-09-30'),
      order(2),
    ]);
    expect(ledger.asked).toEqual([[1, 2]]);
    expect(fiado.fiado).toEqual({
      dueDate: '2026-09-30',
      paidTotal: '7.00',
      remaining: '40.00',
      customerOpenTotal: '40.00',
    });
    expect(plain.fiado).toBeNull();
  });

  it('sem pedidos não consulta nada', async () => {
    const ledger = new FakeFiadoLedger([]);
    expect(await withFiado(ledger, [])).toEqual([]);
    expect(ledger.asked).toEqual([]);
  });

  it('pedido com recebimento ativo não edita nem cancela: 409 com o valor (2026-10-25)', async () => {
    const paid = new FakeFiadoLedger([row({ orderId: 1, paid: '20.00' })]);
    const attempt = assertNoFiadoPayment(paid, order(1));
    await expect(attempt).rejects.toThrow(ConflictException);
    await expect(attempt).rejects.toThrow(
      'Pedido #11 tem 20.00 recebido de fiado: esperado estornar os recebimentos antes de editar ou cancelar',
    );
    const unpaid = new FakeFiadoLedger([row({ orderId: 1 })]);
    await expect(assertNoFiadoPayment(unpaid, order(1))).resolves.toBe(
      undefined,
    );
  });
});
