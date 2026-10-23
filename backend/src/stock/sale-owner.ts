import type { SaleOwner } from '../orders/order-stock.js';

/**
 * As colunas do dono no movimento e na venda além do saldo: uma preenchida, a outra nula (o
 * banco recusa as duas juntas). Nulas as duas = o dono foi apagado depois.
 */
export interface SaleOwnerColumns {
  orderId: number | null;
  staffConsumptionId: number | null;
}

/**
 * O dono da baixa nas colunas do banco.
 *
 * @example ownerColumns({ staffConsumptionId: 3 }) // { orderId: null, staffConsumptionId: 3 }
 */
export function ownerColumns(owner: SaleOwner): SaleOwnerColumns {
  if ('orderId' in owner)
    return { orderId: owner.orderId, staffConsumptionId: null };
  return { orderId: null, staffConsumptionId: owner.staffConsumptionId };
}
