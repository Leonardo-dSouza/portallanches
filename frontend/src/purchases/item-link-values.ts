import type { ItemSupplyLink } from '../api/purchase-types';
import {
  packageChoices,
  type BasePriceChoice,
} from '../costs/base-price-values';

/** A conta do "Ligar a insumo": o preço da nota por unidade do insumo, contra a base de hoje. */
export interface LinkPreview {
  /** Pago por unidade de contagem, 4 casas (`'1.2719'`). */
  paidPerUnit: string;
  /** Preço base de hoje, 4 casas; null quando o insumo não tem base. */
  basePerUnit: string | null;
  /** Diferença sobre a base, 1 casa (`'2.2'`, `'-3.0'`); null sem base. */
  diffPercent: string | null;
  above: boolean;
}

const COST_DECIMALS = 4;

/**
 * A mesma conta do alerta da nota no backend (`purchases/price-alert.ts`), mostrada antes de
 * gravar (2026-11-14): preço unitário da nota ÷ unidades da embalagem, contra o preço base.
 * Aqui é só exibição; o alerta que fica na nota é o do backend, com a base na data da nota.
 *
 * @example linkPreview('45.79', '36', '1.2444') // { paidPerUnit: '1.2719', basePerUnit: '1.2444', diffPercent: '2.2', above: true }
 */
export function linkPreview(
  unitPrice: string,
  packageQuantity: string,
  baseUnitCost: string | null | undefined,
): LinkPreview | null {
  const quantity = Number(packageQuantity);
  if (!(quantity > 0)) return null;
  const scale = 10 ** COST_DECIMALS;
  const paid = Math.round((Number(unitPrice) / quantity) * scale) / scale;
  const paidPerUnit = paid.toFixed(COST_DECIMALS);
  const base = Number(baseUnitCost ?? 0);
  if (!(base > 0))
    return { paidPerUnit, basePerUnit: null, diffPercent: null, above: false };
  const diff = Math.round(((paid - base) / base) * 1000) / 10;
  return {
    paidPerUnit,
    basePerUnit: base.toFixed(COST_DECIMALS),
    diffPercent: diff.toFixed(1),
    above: paid > base,
  };
}

const sameChoice = (a: BasePriceChoice, b: BasePriceChoice) =>
  a.label === b.label && Number(a.quantity) === Number(b.quantity);

/**
 * Embalagens que o item pode ter: as do insumo e a unidade, mais a da ligação gravada quando o
 * insumo não tem mais aquela embalagem (senão a escolha antiga sumiria da tela).
 *
 * @example linkChoices({ packages: [{ name: 'caixa', quantity: '36' }] }, null) // caixa 36 e unidade
 */
export function linkChoices(
  supply: { packages: { name: string; quantity: string }[] },
  saved: BasePriceChoice | null,
): BasePriceChoice[] {
  const choices = packageChoices(supply);
  if (!saved || choices.some((choice) => sameChoice(choice, saved)))
    return choices;
  return [...choices, saved];
}

/**
 * Embalagem marcada ao escolher o insumo: a da ligação gravada, se for o mesmo insumo; senão,
 * a primeira do insumo.
 *
 * @example initialChoice(null, { packages: [{ name: 'caixa', quantity: '36' }] }) // { label: 'caixa', quantity: '36' }
 */
export function initialChoice(
  link: ItemSupplyLink | null | undefined,
  supply: { id: number; packages: { name: string; quantity: string }[] },
): BasePriceChoice {
  if (link && link.supplyId === supply.id)
    return { label: link.label, quantity: link.baseQuantity };
  return packageChoices(supply)[0];
}
