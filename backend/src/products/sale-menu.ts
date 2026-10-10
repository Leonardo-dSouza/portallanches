import { priceOnDate, type DatedProduct } from './dated-price.js';
import { stockLeftOf, type StockComponent } from './stock-left.js';

/** Item que o caixa pode lançar num dia, com o preço daquele dia. */
export interface SaleMenuItem {
  id: number;
  name: string;
  menuNumber: number | null;
  categoryId: number;
  categoryName: string;
  /** Categoria de onde vêm os adicionais deste item; null = não aceita adicionais. */
  addonCategoryId: number | null;
  salePrice: string;
  /**
   * Quantas unidades o saldo do sistema ainda cobre, só quando está abaixo do aviso (padrão 6;
   * decisão do usuário, 2026-10-09). Null = não mostrar (saldo bom, item sem baixa ou dia que
   * não mexe no estoque).
   */
  stockLeft: number | null;
}

/** Produto lido para o cardápio de um dia: identificação + dados de preço por data. */
export interface DatedMenuEntry extends DatedProduct {
  id: number;
  name: string;
  menuNumber: number | null;
  categoryId: number;
  categoryName: string;
  addonCategoryId: number | null;
  /** Insumos com baixa por unidade do item (combo: os dos itens); vazio = sem baixa. */
  stockComponents: StockComponent[];
}

/** Saldo dos insumos com baixa e o aviso; null = o dia escolhido não mexe no estoque. */
export interface MenuStock {
  /** Saldo por insumo, em milésimos. */
  balances: ReadonlyMap<number, number>;
  /** Mostra o saldo abaixo deste número de unidades; 0 = nunca. */
  warnBelow: number;
}

function stockLeftShown(
  entry: DatedMenuEntry,
  stock: MenuStock | null,
): number | null {
  if (!stock) return null;
  const units = stockLeftOf(entry.stockComponents, stock.balances);
  return units !== null && units < stock.warnBelow ? units : null;
}

/**
 * Cardápio do caixa num dia de negócio: só o que vendia naquele dia e tinha preço, com o preço
 * da época (caixa atrasado lançado depois do reajuste) e o saldo baixo das bebidas. Mantém a
 * ordem recebida.
 *
 * @example saleMenuOn(entries, '2026-10-05', null)[0].salePrice // '17.80'
 */
export function saleMenuOn(
  entries: DatedMenuEntry[],
  businessDate: string,
  stock: MenuStock | null,
): SaleMenuItem[] {
  return entries.flatMap((entry) => {
    const { salePrice, sellable } = priceOnDate(entry, businessDate);
    if (!sellable || salePrice === null) return [];
    const { id, name, menuNumber, categoryId, categoryName } = entry;
    const { addonCategoryId } = entry;
    const stockLeft = stockLeftShown(entry, stock);
    const item = { id, name, menuNumber, categoryId, categoryName };
    return [{ ...item, addonCategoryId, salePrice, stockLeft }];
  });
}
