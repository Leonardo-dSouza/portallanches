import type { SaleRemovable } from '../api/types';
import { searchKey, type MenuItem } from './menu-lookup';
import type { DraftLine } from './order-lines';

/** Tecla do painel ou opção do "-tomate": um ingrediente, ou a Salada, que junta dois. */
export interface RemovalChoice {
  key: string;
  label: string;
  supplies: SaleRemovable[];
}

const SALAD_LABEL = 'Salada';
// "s/salada" era a retirada mais comum nas observações reais (8 de 21, 2026-10-30).
const SALAD_SUPPLIES = ['alface', 'tomate'];

function saladChoice(supplies: SaleRemovable[]): RemovalChoice | null {
  const salad = SALAD_SUPPLIES.flatMap((wanted) =>
    supplies.filter((supply) => searchKey(supply.name) === wanted),
  );
  if (salad.length !== SALAD_SUPPLIES.length) return null;
  return { key: 'salada', label: SALAD_LABEL, supplies: salad };
}

const singleChoice = (supply: SaleRemovable): RemovalChoice => ({
  key: String(supply.supplyId),
  label: supply.name,
  supplies: [supply],
});

/**
 * O que dá para tirar da linha: os ingredientes do lanche (cada um sozinho) e a Salada, que tira
 * alface e tomate de uma vez. Retirada já gravada que saiu da receita continua, para poder
 * devolver.
 *
 * @example removalChoices(menu, line).map((c) => c.label) // ['Salada', 'Alface', 'Tomate']
 */
export function removalChoices(
  menu: MenuItem[],
  line: DraftLine,
): RemovalChoice[] {
  const today = menu.find((item) => item.id === line.productId);
  const removables = today?.removables ?? [];
  const known = new Set(removables.map((supply) => supply.supplyId));
  const saved = line.removals.filter((supply) => !known.has(supply.supplyId));
  const supplies = [...removables, ...saved];
  const salad = saladChoice(supplies);
  return [...(salad ? [salad] : []), ...supplies.map(singleChoice)];
}

/**
 * As opções que casam com o "-texto", sem acento nem caixa: "-tomate" é só o tomate e
 * "-salada", os dois.
 *
 * @example searchRemovals(choices, 'tom').map((c) => c.label) // ['Tomate']
 */
export function searchRemovals(
  choices: RemovalChoice[],
  typed: string,
): RemovalChoice[] {
  const tokens = searchKey(typed).split(' ');
  return choices.filter((choice) => {
    const label = searchKey(choice.label);
    return tokens.every((token) => label.includes(token));
  });
}
