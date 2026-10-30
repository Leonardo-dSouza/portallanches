import {
  BadRequestException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { formatCents, toCents } from '../common/money.js';
import { computeCmv, type CostedComponent } from '../products/cmv.js';
import type { SaleRemovable } from '../products/removable-supplies.js';
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
  /** Posição da categoria na aba Categorias: a ordem dos itens no pedido. */
  categorySortOrder: number;
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
  /** O que o caixa pode tirar: só lanche, sem embalagem (2026-10-30). */
  removables: SaleRemovable[];
}

/** Insumo da composição com o custo (CMV) e se ele sai do estoque na venda (baixa). */
export interface SaleComponent extends CostedComponent {
  supplyId: number;
  deductOnSale: boolean;
}

/**
 * Ingrediente tirado do lanche, com o nome da época (como o do produto). `type`, não `interface`:
 * só o tipo aberto vai para a coluna JSON do Prisma.
 */
export type OrderRemoval = {
  supplyId: number;
  supplyName: string;
};

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
  /** Vazio no adicional e no item sem retirada. */
  removals: OrderRemoval[];
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

type LineCost = Pick<OrderLine, 'unitCmv' | 'cmvComplete'>;

/** CMV sem os ingredientes retirados; a receita inteira vazia segue "sem composição". */
function lineCost(product: SaleProduct, removed: number[]): LineCost {
  if (product.components.length === 0)
    return { unitCmv: null, cmvComplete: false };
  const { cmv, complete } = computeCmv(
    product.components.filter((c) => !removed.includes(c.supplyId)),
  );
  return { unitCmv: cmv, cmvComplete: complete };
}

function newLine(product: SaleProduct, quantity: number): OrderLine {
  return {
    productId: product.id,
    productName: product.name,
    menuNumber: product.menuNumber,
    categoryName: product.categoryName,
    quantity,
    unitPrice: product.salePrice ?? '0.00',
    ...lineCost(product, []),
    removals: [],
  };
}

/** Primeira linha gravada de cada produto (item ou adicional): guarda o preço e o CMV da época. */
function keptLines(previous: OrderEntry[]): Map<number, OrderLine> {
  const kept = new Map<number, OrderLine>();
  for (const line of previous.flatMap((e) => [e, ...e.addons]))
    if (!kept.has(line.productId)) kept.set(line.productId, line);
  return kept;
}

const costKey = (productId: number, supplyIds: number[]) =>
  `${productId}|${[...supplyIds].sort((a, b) => a - b).join(',')}`;

/**
 * CMV da época por produto **e** retiradas: duas linhas do mesmo lanche, uma sem o ovo, têm
 * custos diferentes, e o `keptLines` (por produto) guardaria o da primeira nas duas.
 */
function keptCosts(previous: OrderEntry[]): Map<string, LineCost> {
  const kept = new Map<string, LineCost>();
  for (const { productId, removals, unitCmv, cmvComplete } of previous) {
    const key = costKey(
      productId,
      removals.map((r) => r.supplyId),
    );
    if (!kept.has(key)) kept.set(key, { unitCmv, cmvComplete });
  }
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
    return { ...line, quantity, removals: [] };
  }
  return newLine(sellable(products.get(productId), productId), quantity);
}

/** Retiradas com o nome: a já gravada guarda o da época (a receita pode ter mudado). */
function removalsOf(
  item: OrderItemInput,
  product: SaleProduct | undefined,
  previous: OrderEntry[],
): OrderRemoval[] {
  const saved = previous.flatMap((entry) => entry.removals);
  return item.removedSupplyIds.map((supplyId) => {
    const named = saved.find((r) => r.supplyId === supplyId)?.supplyName;
    const today = product?.removables.find((r) => r.supplyId === supplyId);
    return { supplyId, supplyName: named ?? today?.name ?? String(supplyId) };
  });
}

/** Mesmas retiradas de uma linha gravada = CMV da época; senão, calcula com o custo de hoje. */
function itemCost(
  item: OrderItemInput,
  line: OrderLine,
  product: SaleProduct | undefined,
  costs: Map<string, LineCost>,
): LineCost {
  const saved = costs.get(costKey(item.productId, item.removedSupplyIds));
  if (saved) return saved;
  return product ? lineCost(product, item.removedSupplyIds) : line;
}

/**
 * Linhas do pedido com o preço do cadastro no dia do pedido e os adicionais (quantidade por
 * unidade × a da linha). Na edição, todo produto que já estava no pedido guarda o preço e o CMV
 * da época (só a quantidade muda); produto novo precisa estar ativo e com preço. A retirada tira
 * o ingrediente do CMV e não mexe no preço (2026-10-30).
 *
 * @example priceOrderEntries([{ productId: 9, quantity: 2, note: null, addons: [], removedSupplyIds: [] }], productsById, [])[0].unitPrice // '17.80'
 */
export function priceOrderEntries(
  items: OrderItemInput[],
  products: Map<number, SaleProduct>,
  previous: OrderEntry[],
): OrderEntry[] {
  const kept = keptLines(previous);
  const costs = keptCosts(previous);
  return items.map((item) => {
    const line = priceLine(item.productId, item.quantity, products, kept);
    const product = products.get(item.productId);
    return {
      ...line,
      ...itemCost(item, line, product, costs),
      removals: removalsOf(item, product, previous),
      note: item.note,
      addons: item.addons.map((addon) =>
        priceLine(
          addon.productId,
          addon.quantity * item.quantity,
          products,
          kept,
        ),
      ),
    };
  });
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
