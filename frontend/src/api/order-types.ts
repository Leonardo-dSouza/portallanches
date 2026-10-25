import type { Money } from './types';

/**
 * Linha de um pedido gravado: cópias do cardápio e o preço da época do lançamento. O CMV da época
 * fica no servidor (2026-10-25: custo não sai pela API do pedido).
 */
export interface OrderItemLine {
  productId: number;
  productName: string;
  menuNumber: number | null;
  categoryName: string;
  quantity: number;
  unitPrice: Money;
}

/**
 * Item do pedido com a observação e os adicionais (pedido do usuário, 2026-10-09). O
 * `quantity` do adicional é o total (por unidade × a do item).
 */
export interface OrderItem extends OrderItemLine {
  note: string | null;
  addons: OrderItemLine[];
}

/** Adicional pedido, com a quantidade por unidade do item. */
export interface OrderAddonInput {
  productId: number;
  quantity: number;
}

export interface OrderItemInput {
  productId: number;
  quantity: number;
  /** Texto livre para a comanda ("sem tomate"); omitido = sem observação. */
  note?: string;
  addons?: OrderAddonInput[];
}
