import type { Prisma } from '../generated/prisma/client.js';
import type { SaleNeed } from './stock-needs.js';

export const ORDER_STOCK = Symbol('ORDER_STOCK');

/** De quem é a baixa: um pedido ou um consumo interno (2026-10-23). */
export type SaleOwner = { orderId: number } | { staffConsumptionId: number };

/**
 * Baixa de um pedido (ou de um consumo interno) no estoque, gravada na mesma transação dele. O
 * módulo de estoque implementa (`stock/prisma-sale-stock.ts`); só os repositórios Prisma chamam.
 */
export interface OrderStockWriter {
  /**
   * Devolve o que o dono tinha baixado e baixa `needs` (vazio = só devolve). Devolve o que o
   * saldo do sistema não cobriu: o pedido sai mesmo assim (decisão do usuário, 2026-10-09).
   */
  syncSale(
    tx: Prisma.TransactionClient,
    owner: SaleOwner,
    userId: number,
    needs: SaleNeed[],
  ): Promise<SaleShortfall[]>;
}

/** Insumo vendido além do saldo do sistema (fica "Conferir" na Situação). */
export interface SaleShortfall {
  supplyId: number;
  supplyName: string;
  /** Quanto faltou, na unidade de contagem ('1'). */
  missing: string;
}
