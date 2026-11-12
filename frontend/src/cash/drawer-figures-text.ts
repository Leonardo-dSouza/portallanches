import { centsToMoney, formatMoney, moneyToCents } from '../api/money';
import type { DrawerVerdict, Money } from '../api/types';
import { formatOrderTime } from './order-time';

/**
 * Formata o resultado da conferência de uma forma de pagamento.
 *
 * @example drawerLineResultText('MATCH', '0.00') // 'Bateu'
 * @example drawerLineResultText('MATCH', '1.50') // 'Bateu (sobrou R$ 1,50)'
 * @example drawerLineResultText('MATCH', '-1.50') // 'Bateu (faltou R$ 1,50)'
 * @example drawerLineResultText('OVER', '5.00') // 'Sobrou R$ 5,00'
 * @example drawerLineResultText('SHORT', '-5.00') // 'Faltou R$ 5,00'
 */
export function drawerLineResultText(
  verdict: DrawerVerdict,
  difference: Money,
): string {
  const cents = moneyToCents(difference);
  const formattedAbs = formatMoney(centsToMoney(Math.abs(cents)));
  if (verdict === 'MATCH') {
    if (cents === 0) return 'Bateu';
    return cents > 0
      ? `Bateu (sobrou ${formattedAbs})`
      : `Bateu (faltou ${formattedAbs})`;
  }
  if (verdict === 'OVER') {
    return `Sobrou ${formattedAbs}`;
  }
  return `Faltou ${formattedAbs}`;
}

/**
 * Frase com o operador que contou a gaveta e a hora no fuso da loja.
 *
 * @example drawerCountedByText('Ana', '2026-10-10T23:41:00Z') // 'Contado por Ana às 20:41'
 */
export function drawerCountedByText(
  countedBy: string,
  countedAt: string,
): string {
  return `Contado por ${countedBy} às ${formatOrderTime(countedAt)}`;
}
