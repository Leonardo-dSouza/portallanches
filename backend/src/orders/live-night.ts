import {
  businessHour,
  shiftBusinessDate,
  toBusinessDate,
} from '../closing/business-date.js';

/** Até esta hora o caixa de ontem ainda é o da noite que acabou (pedidos depois da meia-noite). */
const NIGHT_ENDS_AT_HOUR = 6;

/**
 * Se o caixa de `orderDate` é a noite em andamento: o de hoje, ou o de ontem antes das 6h.
 * Só nela o pedido mexe no estoque (decisão do usuário, 2026-10-09: caixa atrasado não baixa
 * nem devolve; a próxima contagem acerta), nasce "Em preparo" e imprime a comanda (2026-10-10).
 *
 * @example isLiveNight('2026-10-09', new Date('2026-10-10T08:00:00Z'), 'America/Sao_Paulo') // true (05h)
 */
export function isLiveNight(
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
