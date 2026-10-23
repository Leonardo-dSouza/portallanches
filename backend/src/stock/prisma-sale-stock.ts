import { Injectable } from '@nestjs/common';
import { fromMilli, toMilli } from '../common/quantity.js';
import type { Prisma } from '../generated/prisma/client.js';
import type {
  OrderStockWriter,
  SaleOwner,
  SaleShortfall,
} from '../orders/order-stock.js';
import type { SaleNeed } from '../orders/stock-needs.js';
import { planSale, type LotTake } from './fefo.js';
import { toBalance } from './prisma-lot-balance.js';
import { ownerColumns, type SaleOwnerColumns } from './sale-owner.js';
import { netTakenByLot } from './sale-reversal.js';

type Tx = Prisma.TransactionClient;

/** Quantidade com sinal do movimento ('-3' na venda) em milésimos. */
const signedMilli = (quantity: Prisma.Decimal): number =>
  quantity.isNegative()
    ? -toMilli(quantity.abs().toString())
    : toMilli(quantity.toString());

/**
 * Devolve a cada lote o que as vendas do dono tiraram e ainda não voltou; a venda além do
 * saldo que ainda estava pendente some junto (o pedido mudou ou saiu).
 */
async function returnSale(tx: Tx, owner: SaleOwner, userId: number) {
  await tx.stockOversale.deleteMany({ where: owner });
  const moves = await tx.stockMovement.findMany({
    where: { ...owner, kind: { in: ['SALE', 'SALE_RETURN'] } },
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
        ...ownerColumns(owner),
        kind: 'SALE_RETURN',
        quantity,
        createdById: userId,
      },
    });
  }
}

/** Lotes com saldo do insumo, travados até o fim da transação. */
async function lockedLots(tx: Tx, supplyId: number) {
  // Dois caixas vendendo a mesma lata ao mesmo tempo não tiram do mesmo saldo.
  await tx.$queryRaw`SELECT id FROM stock_lots WHERE supply_id = ${supplyId} AND remaining > 0 FOR UPDATE`;
  return tx.stockLot.findMany({
    where: { supplyId, remaining: { gt: 0 } },
    select: { id: true, remaining: true, expiresOn: true },
  });
}

/** A baixa de um insumo e de quem ela é (as duas colunas nulas se o dono já foi apagado). */
export interface LotSale extends SaleOwnerColumns {
  userId: number;
  supplyId: number;
}

/**
 * Baixa de um pedido ou consumo num lote (movimento SALE com o dono). Também usada pela entrada
 * que desconta uma venda além do saldo.
 *
 * @example await takeSaleFromLot(tx, { orderId: 7, staffConsumptionId: null, userId: 2, supplyId: 30 }, { lotId: 14, milli: 2000 });
 */
export async function takeSaleFromLot(
  tx: Tx,
  sale: LotSale,
  take: LotTake,
): Promise<void> {
  const quantity = fromMilli(take.milli);
  await tx.stockLot.update({
    where: { id: take.lotId },
    data: { remaining: { decrement: quantity } },
  });
  await tx.stockMovement.create({
    data: {
      supplyId: sale.supplyId,
      lotId: take.lotId,
      orderId: sale.orderId,
      staffConsumptionId: sale.staffConsumptionId,
      kind: 'SALE',
      quantity: `-${quantity}`,
      createdById: sale.userId,
    },
  });
}

/** Guarda o que o saldo não cobriu ("Conferir" na Situação) e devolve o aviso com o nome. */
async function recordOversale(
  tx: Tx,
  owner: SaleOwner,
  supplyId: number,
  missingMilli: number,
): Promise<SaleShortfall> {
  const quantity = fromMilli(missingMilli);
  await tx.stockOversale.create({
    data: { supplyId, ...ownerColumns(owner), quantity },
  });
  const supply = await tx.supply.findUniqueOrThrow({
    where: { id: supplyId },
    select: { name: true },
  });
  return { supplyId, supplyName: supply.name, missing: quantity };
}

/** Tira a necessidade dos lotes FEFO; o que faltar vira venda além do saldo. */
async function takeForSale(
  tx: Tx,
  owner: SaleOwner,
  userId: number,
  need: SaleNeed,
): Promise<SaleShortfall | null> {
  const { supplyId } = need;
  const lots = await lockedLots(tx, supplyId);
  const plan = planSale(lots.map(toBalance), need.milli);
  const sale = { ...ownerColumns(owner), userId, supplyId };
  for (const take of plan.takes) await takeSaleFromLot(tx, sale, take);
  if (plan.missingMilli === 0) return null;
  return recordOversale(tx, owner, supplyId, plan.missingMilli);
}

/** Baixa das bebidas a cada pedido do dia (pedido do usuário, 2026-10-09) e consumo interno. */
@Injectable()
export class PrismaSaleStock implements OrderStockWriter {
  async syncSale(
    tx: Tx,
    owner: SaleOwner,
    userId: number,
    needs: SaleNeed[],
  ): Promise<SaleShortfall[]> {
    await returnSale(tx, owner, userId);
    const shortfalls: SaleShortfall[] = [];
    for (const need of needs) {
      const shortfall = await takeForSale(tx, owner, userId, need);
      if (shortfall) shortfalls.push(shortfall);
    }
    return shortfalls;
  }
}
