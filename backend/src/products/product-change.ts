import { shiftBusinessDate } from '../closing/business-date.js';
import { toCents } from '../common/money.js';

/** O que o histórico acompanha de um produto antes da gravação. */
export interface TrackedProduct {
  salePrice: string | null;
  active: boolean;
  /** Dia (`YYYY-MM-DD`) em que saiu do cardápio; nulo se ativo ou se saiu antes do histórico. */
  deactivatedOn: string | null;
}

/** Campos que a gravação muda; ausente = não mexe. */
export interface ProductChange {
  salePrice?: string | null;
  active?: boolean;
}

export interface SupersededPrice {
  salePrice: string;
  /** Último dia (inclusivo) em que o preço valeu. */
  validUntil: string;
}

export interface ProductChangePlan {
  /** Preço que deixa de valer hoje; nulo = nada a guardar. */
  superseded: SupersededPrice | null;
  deactivatedOn: string | null;
}

/**
 * Decide o que a troca de preço ou de ativo deixa no histórico (pedido do usuário, 2026-10-09:
 * reajuste do cardápio). O preço novo vale a partir de hoje, então o antigo vale até ontem;
 * um caixa de dia passado lançado depois continua com o preço da época.
 *
 * @example planProductChange({ salePrice: '17.80', active: true, deactivatedOn: null }, { salePrice: '19.90' }, '2026-10-10').superseded // { salePrice: '17.80', validUntil: '2026-10-09' }
 */
export function planProductChange(
  before: TrackedProduct,
  change: ProductChange,
  today: string,
): ProductChangePlan {
  return {
    superseded: supersededPrice(before.salePrice, change, today),
    deactivatedOn: nextDeactivatedOn(before, change.active, today),
  };
}

function supersededPrice(
  previous: string | null,
  change: ProductChange,
  today: string,
): SupersededPrice | null {
  if (previous === null || change.salePrice === undefined) return null;
  if (change.salePrice !== null && samePrice(previous, change.salePrice))
    return null;
  return { salePrice: previous, validUntil: shiftBusinessDate(today, -1) };
}

const samePrice = (a: string, b: string): boolean => toCents(a) === toCents(b);

function nextDeactivatedOn(
  before: TrackedProduct,
  active: boolean | undefined,
  today: string,
): string | null {
  if (active === undefined) return before.deactivatedOn;
  if (active) return null;
  return before.active ? today : before.deactivatedOn;
}
