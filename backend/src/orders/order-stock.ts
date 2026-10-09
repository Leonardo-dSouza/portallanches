import type { Prisma } from '../generated/prisma/client.js';
import type { SaleNeed } from './stock-needs.js';

export const ORDER_STOCK = Symbol('ORDER_STOCK');

/**
 * Baixa de um pedido no estoque, gravada na mesma transação do pedido. O módulo de estoque
 * implementa (`stock/prisma-sale-stock.ts`); só o repositório Prisma dos pedidos chama.
 */
export interface OrderStockWriter {
  /** Devolve o que o pedido tinha baixado e baixa `needs` (vazio = só devolve). */
  syncSale(
    tx: Prisma.TransactionClient,
    orderId: number,
    userId: number,
    needs: SaleNeed[],
  ): Promise<void>;
}
