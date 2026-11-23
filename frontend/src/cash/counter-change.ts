import {
  centsToMoney,
  formatMoney,
  moneyToCents,
  toApiMoney,
} from '../api/money';

/** Troco do balcão pronto para a tela; `short` = o recebido não cobre o total. */
export interface CounterChange {
  text: string;
  short: boolean;
}

/**
 * Troco do balcão pago em dinheiro (pedido do usuário, 2026-11-22): o que o cliente deu menos o
 * total. Só na tela, nada vai para a API. Null sem valor ou com valor inválido.
 *
 * @example counterChangeOf('50', 1780) // { text: 'Troco R$ 32,20', short: false }
 */
export function counterChangeOf(
  received: string,
  totalCents: number,
): CounterChange | null {
  const money = toApiMoney(received);
  if (!money) return null;
  const diff = moneyToCents(money) - totalCents;
  if (diff < 0)
    return { text: `Faltam ${formatMoney(centsToMoney(-diff))}`, short: true };
  return { text: `Troco ${formatMoney(centsToMoney(diff))}`, short: false };
}
