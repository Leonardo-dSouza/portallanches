import {
  BadRequestException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { formatCents, toCents } from '../common/money.js';
import { computeCmv, type CostedComponent } from '../products/cmv.js';
import type { OrderItemInput } from './order-item-input.js';

/**
 * Produto do cardápio como o pedido precisa: preço e situação no dia do fechamento do pedido
 * (caixa atrasado usa o preço da época) e composição para o CMV.
 */
export interface SaleProduct {
  id: number;
  name: string;
  menuNumber: number | null;
  categoryId: number;
  categoryName: string;
  /** Categoria de onde vêm os adicionais deste item; null = não aceita adicionais. */
  addonCategoryId: number | null;
  /** Combo: não entra como adicional de outro item. */
  isBundle: boolean;
  /** Preço no dia do pedido; nulo = sem preço: não pode ser vendido. */
  salePrice: string | null;
  /** Vendável no dia do pedido (ativo, ou saiu do cardápio depois daquele dia). */
  active: boolean;
  /** Vazio = produto sem composição (ex.: açaí): CMV desconhecido. Combo: os dos itens. */
  components: SaleComponent[];
}

/** Insumo da composição com o custo (CMV) e se ele sai do estoque na venda (baixa). */
export interface SaleComponent extends CostedComponent {
  supplyId: number;
  deductOnSale: boolean;
}

/** Linha gravada no pedido: cópias e valores da época do lançamento. */
export interface OrderLine {
  productId: number;
  productName: string;
  menuNumber: number | null;
  categoryName: string;
  quantity: number;
  unitPrice: string;
  /** Nulo = produto sem composição. */
  unitCmv: string | null;
  /** Falso = faltou custo de algum insumo (ou não há composição). */
  cmvComplete: boolean;
}

/** Linha do pedido com a observação e os adicionais (quantidade total de cada um). */
export interface OrderEntry extends OrderLine {
  note: string | null;
  addons: OrderLine[];
}

function sellable(product: SaleProduct | undefined, id: number): SaleProduct {
  if (!product)
    throw new BadRequestException(
      `Produto ${id} inexistente: esperado id de um item do cardápio em products`,
    );
  if (product.active && product.salePrice !== null) return product;
  const why = product.active ? 'sem preço' : 'inativo';
  throw new UnprocessableEntityException(
    `"${product.name}" está ${why} no Cardápio: esperado item ativo e com preço de venda`,
  );
}

function newLine(product: SaleProduct, quantity: number): OrderLine {
  const hasComposition = product.components.length > 0;
  const cmv = hasComposition ? computeCmv(product.components) : null;
  return {
    productId: product.id,
    productName: product.name,
    menuNumber: product.menuNumber,
    categoryName: product.categoryName,
    quantity,
    unitPrice: product.salePrice ?? '0.00',
    unitCmv: cmv?.cmv ?? null,
    cmvComplete: cmv?.complete ?? false,
  };
}

/** Primeira linha gravada de cada produto (item ou adicional): guarda o preço e o CMV da época. */
function keptLines(previous: OrderEntry[]): Map<number, OrderLine> {
  const kept = new Map<number, OrderLine>();
  for (const line of previous.flatMap((e) => [e, ...e.addons]))
    if (!kept.has(line.productId)) kept.set(line.productId, line);
  return kept;
}

function priceLine(
  productId: number,
  quantity: number,
  products: Map<number, SaleProduct>,
  kept: Map<number, OrderLine>,
): OrderLine {
  const before = kept.get(productId);
  if (before) {
    const { note: _note, addons: _addons, ...line } = before as OrderEntry;
    return { ...line, quantity };
  }
  return newLine(sellable(products.get(productId), productId), quantity);
}

/**
 * Linhas do pedido com o preço do cadastro no dia do pedido e os adicionais (quantidade por
 * unidade × a da linha). Na edição, todo produto que já estava no pedido guarda o preço e o CMV
 * da época (só a quantidade muda); produto novo precisa estar ativo e com preço.
 *
 * @example priceOrderEntries([{ productId: 9, quantity: 2, note: null, addons: [] }], productsById, [])[0].unitPrice // '17.80'
 */
export function priceOrderEntries(
  items: OrderItemInput[],
  products: Map<number, SaleProduct>,
  previous: OrderEntry[],
): OrderEntry[] {
  const kept = keptLines(previous);
  return items.map((item) => ({
    ...priceLine(item.productId, item.quantity, products, kept),
    note: item.note,
    addons: item.addons.map((addon) =>
      priceLine(
        addon.productId,
        addon.quantity * item.quantity,
        products,
        kept,
      ),
    ),
  }));
}

/**
 * Valor do pedido = soma dos itens + taxa de entrega (o que o cliente pagou; é o que bate com o
 * PIX e o dinheiro do caixa). Em centavos inteiros, sem float.
 *
 * @example orderAmount(lines, '4.50') // '64.90'
 */
export function orderAmount(lines: OrderLine[], deliveryFee: string): string {
  const items = lines.reduce(
    (sum, line) => sum + line.quantity * toCents(line.unitPrice),
    0,
  );
  return formatCents(items + toCents(deliveryFee));
}
