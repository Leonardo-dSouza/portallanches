import type { OrderType } from '../api/types';
import type { MenuItem } from './menu-lookup';
import type { DraftLine } from './order-lines';

// Lista de preços do pedido (2026-11-23): o iFood cobra o preço do app, maior que o do balcão.
// Espelha `backend/src/orders/price-list.ts`: quem decide o preço gravado é a API.

const isFree = (item: MenuItem): boolean => Number(item.salePrice) === 0;

/** O item com o preço iFood; o grátis no balcão (o pão do artesanal) segue grátis; null = fora. */
function ifoodItem(item: MenuItem): MenuItem | null {
  if (item.ifoodPrice !== null) return { ...item, salePrice: item.ifoodPrice };
  return isFree(item) ? item : null;
}

/**
 * O cardápio que o formulário usa para o tipo do pedido: no iFood, só o que tem preço iFood (e o
 * que é grátis), com esse preço; nos outros tipos, o cardápio como veio.
 *
 * @example menuForType(menu, 'IFOOD').find((i) => i.id === 9)?.salePrice // '24.90'
 */
export function menuForType(menu: MenuItem[], type: OrderType): MenuItem[] {
  if (type !== 'IFOOD') return menu;
  return menu.flatMap((item) => ifoodItem(item) ?? []);
}

/** Mesmas listas de preço? Trocar balcão por entrega não muda o preço; iFood muda. */
export const samePriceList = (a: OrderType, b: OrderType): boolean =>
  (a === 'IFOOD') === (b === 'IFOOD');

/**
 * As linhas digitadas com o preço do cardápio novo (o item, o pão e os adicionais). O que não
 * existe nele fica com o preço antigo: a API recusa ao salvar, dizendo qual está sem preço.
 *
 * @example repricedLines(lines, menuForType(menu, 'IFOOD'))[0].unitPrice // '24.90'
 */
export function repricedLines(
  lines: DraftLine[],
  menu: MenuItem[],
): DraftLine[] {
  const priceOf = (productId: number, current: string) =>
    menu.find((item) => item.id === productId)?.salePrice ?? current;
  return lines.map((line) => ({
    ...line,
    unitPrice: priceOf(line.productId, line.unitPrice),
    choice: line.choice && {
      ...line.choice,
      unitPrice: priceOf(line.choice.productId, line.choice.unitPrice),
    },
    addons: line.addons.map((addon) => ({
      ...addon,
      unitPrice: priceOf(addon.productId, addon.unitPrice),
    })),
  }));
}
