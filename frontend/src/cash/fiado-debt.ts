import type { FiadoDebtor } from '../api/fiado-types';
import { formatMoney } from '../api/money';
import type { Order } from '../api/types';

/**
 * O que o cliente achado já deve no fiado, para o caixa ver antes de pendurar mais (2026-10-25).
 * Na edição do fiado do mesmo cliente, o total da API já conta este pedido.
 *
 * @example fiadoDebtText(15, debtors, null) // 'Já deve R$ 30,00 no fiado.'
 */
export function fiadoDebtText(
  customerId: number | null,
  debtors: FiadoDebtor[],
  editing: Order | null,
): string | null {
  if (customerId === null) return null;
  if (editing?.fiado && editing.customerId === customerId)
    return `Deve ${formatMoney(editing.fiado.customerOpenTotal)} no fiado, com este pedido.`;
  const debtor = debtors.find((d) => d.customerId === customerId);
  return debtor ? `Já deve ${formatMoney(debtor.openTotal)} no fiado.` : null;
}
