import { priceOnDate, type DatedProduct } from './dated-price.js';

/** Item que o caixa pode lançar num dia, com o preço daquele dia. */
export interface SaleMenuItem {
  id: number;
  name: string;
  menuNumber: number | null;
  categoryName: string;
  salePrice: string;
}

/** Produto lido para o cardápio de um dia: identificação + dados de preço por data. */
export interface DatedMenuEntry extends DatedProduct {
  id: number;
  name: string;
  menuNumber: number | null;
  categoryName: string;
}

/**
 * Cardápio do caixa num dia de negócio: só o que vendia naquele dia e tinha preço, com o preço
 * da época (caixa atrasado lançado depois do reajuste). Mantém a ordem recebida.
 *
 * @example saleMenuOn(entries, '2026-10-05')[0].salePrice // '17.80'
 */
export function saleMenuOn(
  entries: DatedMenuEntry[],
  businessDate: string,
): SaleMenuItem[] {
  return entries.flatMap((entry) => {
    const { salePrice, sellable } = priceOnDate(entry, businessDate);
    if (!sellable || salePrice === null) return [];
    const { id, name, menuNumber, categoryName } = entry;
    return [{ id, name, menuNumber, categoryName, salePrice }];
  });
}
