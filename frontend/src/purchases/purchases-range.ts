import type { DateRange } from '../api/types';
import { addDays, toDateKey } from '../history/date-keys';
import { MAX_PERIOD_DAYS } from '../history/period-range';

/**
 * O que Compras mostra (pedido do usuário, 2026-11-14): todas as notas, sem escolher período;
 * para achar uma, busca-se o mercado ou a data. A API aceita no máximo 366 dias, então são os
 * últimos 12 meses até hoje (a 1ª nota é de 19/10/2026: por enquanto, isso é "todas").
 *
 * @example purchasesRange(new Date(2026, 10, 14)) // { from: '2025-11-14', to: '2026-11-14' }
 */
export function purchasesRange(today: Date): DateRange {
  return {
    from: toDateKey(addDays(today, 1 - MAX_PERIOD_DAYS)),
    to: toDateKey(today),
  };
}
