import { Injectable } from '@nestjs/common';
import { fromMilli, toMilli } from '../common/quantity.js';
import type { Prisma } from '../generated/prisma/client.js';
import type { OrderStockWriter } from '../orders/order-stock.js';
import type { SaleNeed } from '../orders/stock-needs.js';
import { planSale } from './fefo.js';
import { toBalance } from './prisma-stock.repository.js';
import { netTakenByLot } from './sale-reversal.js';

type Tx = Prisma.TransactionClient;

/** Quantidade com sinal do movimento ('-3' na venda) em milésimos. */
const signedMilli = (quantity: Prisma.Decimal): number =>
  quantity.isNegative()
    ? -toMilli(quantity.abs().toString())
    : toMilli(quantity.toString());

/** Devolve a cada lote o que as vendas do pedido tiraram e ainda não voltou. */
async function returnSale(tx: Tx, orderId: number, userId: number) {
  const moves = await tx.stockMovement.findMany({
    where: { orderId, kind: { in: ['SALE', 'SALE_RETURN'] } },
    select: { lotId: true, supplyId: true, quantity: true },
  });
  const signed = moves.map((m) => ({ ...m, milli: signedMilli(m.quantity) }));
  for (const back of netTakenByLot(signed)) {
    const quantity = fromMilli(back.milli);
    await tx.stockLot.update({
      where: { id: back.lotId },
      data: { remaining: { increment: quantity } },
    });
    await tx.stockMovement.create({
      data: {
        supplyId: back.supplyId,
        lotId: back.lotId,
        orderId,
        kind: 'SALE_RETURN',
        quantity,
        createdById: userId,
      },
    });
  }
}

/** Tira a necessidade dos lotes FEFO, com os lotes do insumo travados até o fim da transação. */
async function takeForSale(
  tx: Tx,
  orderId: number,
  userId: number,
  need: SaleNeed,
) {
  const { supplyId } = need;
  // Dois caixas vendendo a mesma lata ao mesmo tempo não tiram do mesmo saldo.
  await tx.$queryRaw`SELECT id FROM stock_lots WHERE supply_id = ${supplyId} AND remaining > 0 FOR UPDATE`;
  const lots = await tx.stockLot.findMany({
    where: { supplyId, remaining: { gt: 0 } },
    select: { id: true, remaining: true, expiresOn: true },
  });
  for (const take of planSale(lots.map(toBalance), need.milli)) {
    const quantity = fromMilli(take.milli);
    await tx.stockLot.update({
      where: { id: take.lotId },
      data: { remaining: { decrement: quantity } },
    });
    await tx.stockMovement.create({
      data: {
        supplyId,
        lotId: take.lotId,
        orderId,
        kind: 'SALE',
        quantity: `-${quantity}`,
        createdById: userId,
      },
    });
  }
}

/** Baixa das bebidas a cada pedido do dia (pedido do usuário, 2026-10-09). */
@Injectable()
export class PrismaSaleStock implements OrderStockWriter {
  async syncSale(
    tx: Tx,
    orderId: number,
    userId: number,
    needs: SaleNeed[],
  ): Promise<void> {
    await returnSale(tx, orderId, userId);
    for (const need of needs) await takeForSale(tx, orderId, userId, need);
  }
}
