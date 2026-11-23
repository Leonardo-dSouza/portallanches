import { priceOnDate, type DatedProduct } from './dated-price.js';
import type { SaleRemovable } from './removable-supplies.js';
import { stockLeftOf, type StockComponent } from './stock-left.js';

/** Item que o caixa pode lançar num dia, com o preço daquele dia. */
/** Item do combo no cardápio do caixa: só o nome, a quantidade por combo e se é adicional. */
export interface SaleBundleItem {
  name: string;
  quantity: number;
  addon: boolean;
}

export interface SaleMenuItem {
  id: number;
  name: string;
  menuNumber: number | null;
  categoryId: number;
  categoryName: string;
  /** Categoria de onde vêm os adicionais deste item; null = não aceita adicionais. */
  addonCategoryId: number | null;
  /** Categoria da escolha obrigatória (o pão do artesanal, 2026-11-08); null = sem escolha. */
  choiceCategoryId: number | null;
  /** Posição entre as opções da categoria: a tecla 1, 2, 3 da escolha no caixa. */
  sortOrder: number;
  salePrice: string;
  /** Preço no app do iFood (2026-11-23); null = fica apagado no pedido do iFood. */
  ifoodPrice: string | null;
  /**
   * Quantas unidades o saldo do sistema ainda cobre, só quando está abaixo do aviso (padrão 6;
   * decisão do usuário, 2026-10-09). Null = não mostrar (saldo bom, item sem baixa ou dia que
   * não mexe no estoque).
   */
  stockLeft: number | null;
  /** O que o caixa pode tirar do lanche; vazio nos outros itens. */
  removables: SaleRemovable[];
  /** Itens do combo na ordem gravada, para a comanda abrir o combo; vazio fora de combo. */
  bundleItems: SaleBundleItem[];
}

/** Produto lido para o cardápio de um dia: identificação + dados de preço por data. */
export interface DatedMenuEntry extends DatedProduct {
  id: number;
  name: string;
  menuNumber: number | null;
  categoryId: number;
  categoryName: string;
  addonCategoryId: number | null;
  choiceCategoryId: number | null;
  sortOrder: number;
  /** Preço no app do iFood, sem histórico (2026-11-23). */
  ifoodPrice: string | null;
  /** Insumos com baixa por unidade do item (combo: os dos itens); vazio = sem baixa. */
  stockComponents: StockComponent[];
  removables: SaleRemovable[];
  bundleItems: SaleBundleItem[];
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
    const { addonCategoryId, choiceCategoryId, sortOrder, removables } = entry;
    const stockLeft = stockLeftShown(entry, stock);
    const item = { id, name, menuNumber, categoryId, categoryName };
    const links = { addonCategoryId, choiceCategoryId, sortOrder };
    const { bundleItems, ifoodPrice } = entry;
    const prices = { salePrice, ifoodPrice };
    return [
      { ...item, ...links, ...prices, stockLeft, removables, bundleItems },
    ];
  });
}
