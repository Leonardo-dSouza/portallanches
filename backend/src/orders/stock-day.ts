import {
  businessHour,
  shiftBusinessDate,
  toBusinessDate,
} from '../closing/business-date.js';

/** Até esta hora o caixa de ontem ainda é o da noite que acabou (pedidos depois da meia-noite). */
const NIGHT_ENDS_AT_HOUR = 6;

/**
 * Se um pedido do caixa de `orderDate` mexe no estoque agora (decisão do usuário, 2026-10-09):
 * só o caixa de hoje, ou o de ontem antes das 6h. Caixa atrasado não baixa (nem devolve ao
 * editar/apagar): a próxima contagem acerta, e o fardo que entrou depois fica intacto.
 *
 * @example movesStock('2026-10-09', new Date('2026-10-10T08:00:00Z'), 'America/Sao_Paulo') // true (05h)
 */
export function movesStock(
  orderDate: string,
  now: Date,
  timeZone: string,
): boolean {
  const today = toBusinessDate(now, timeZone);
  if (orderDate === today) return true;
  const yesterday = shiftBusinessDate(today, -1);
  return (
    orderDate === yesterday && businessHour(now, timeZone) < NIGHT_ENDS_AT_HOUR
  );
}
