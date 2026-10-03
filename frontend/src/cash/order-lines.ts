import type { OrderItem } from '../api/types';
import type { MenuItem } from './menu-lookup';

/** Linha da comanda enquanto o caixa digita (o preço é o do cadastro ou o da época). */
export interface DraftLine {
  productId: number;
  name: string;
  menuNumber: number | null;
  categoryName: string;
  unitPrice: string;
  quantity: number;
}

const MAX_QUANTITY = 99;

const clamp = (quantity: number) => Math.min(quantity, MAX_QUANTITY);

/**
 * Põe o item na comanda. Repetido soma na linha que já existe e ela vai para o fim, para o
 * "+"/"-" do teclado agir no que acabou de ser digitado.
 *
 * @example addLine([], xSalada, 2)[0].quantity // 2
 */
export function addLine(
  lines: DraftLine[],
  item: MenuItem,
  quantity: number,
): DraftLine[] {
  const existing = lines.find((line) => line.productId === item.id);
  const others = lines.filter((line) => line.productId !== item.id);
  const line: DraftLine = existing
    ? { ...existing, quantity: clamp(existing.quantity + quantity) }
    : {
        productId: item.id,
        name: item.name,
        menuNumber: item.menuNumber,
        categoryName: item.categoryName,
        unitPrice: item.salePrice,
        quantity: clamp(quantity),
      };
  return [...others, line];
}

/**
 * Soma `delta` na quantidade de um produto; no zero a linha sai.
 *
 * @example changeQuantity(lines, 9, -1)
 */
export function changeQuantity(
  lines: DraftLine[],
  productId: number,
  delta: number,
): DraftLine[] {
  return lines
    .map((line) =>
      line.productId === productId
        ? { ...line, quantity: clamp(line.quantity + delta) }
        : line,
    )
    .filter((line) => line.quantity > 0);
}

/** "+"/"-" com o campo vazio: mexe na última linha. */
export function adjustLast(lines: DraftLine[], delta: number): DraftLine[] {
  const last = lines.at(-1);
  return last ? changeQuantity(lines, last.productId, delta) : lines;
}

/** `'17.80'` → 1780, sem float. */
function centsOf(money: string): number {
  const [integerPart, cents = ''] = money.split('.');
  return Number(integerPart) * 100 + Number(cents.padEnd(2, '0').slice(0, 2));
}

/**
 * Prévia do total enquanto digita (itens + taxa), em centavos inteiros. É só para mostrar: o
 * valor gravado é o que a API calcula com o preço do cadastro.
 *
 * @example previewTotalCents(lines, '4.50') // 6490
 */
export function previewTotalCents(lines: DraftLine[], fee: string): number {
  const items = lines.reduce(
    (sum, line) => sum + line.quantity * centsOf(line.unitPrice),
    0,
  );
  return items + (fee ? centsOf(fee) : 0);
}

/** Centavos inteiros → formato da API (`6490` → `'64.90'`), para `formatMoney`. */
export function centsToMoney(cents: number): string {
  return `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, '0')}`;
}

/** Subtotal da linha (quantidade × preço), só para mostrar. */
export function lineTotal(line: DraftLine): string {
  return centsToMoney(line.quantity * centsOf(line.unitPrice));
}

/** Linhas de um pedido gravado, para editar (mantêm o preço da época). */
export function linesOfOrder(items: OrderItem[]): DraftLine[] {
  return items.map((item) => ({
    productId: item.productId,
    name: item.productName,
    menuNumber: item.menuNumber,
    categoryName: item.categoryName,
    unitPrice: item.unitPrice,
    quantity: item.quantity,
  }));
}

/**
 * Resumo de uma linha para a lista de pedidos; artesanal ganha "(art.)" porque o nome se repete.
 *
 * @example describeItems(order.items) // '2× X Salada, X Salada (art.), Coca Cola 600ml'
 */
export function describeItems(items: OrderItem[]): string {
  return items
    .map((item) => {
      const quantity = item.quantity > 1 ? `${item.quantity}× ` : '';
      const artisanal = item.categoryName === 'Artesanal' ? ' (art.)' : '';
      return `${quantity}${item.productName}${artisanal}`;
    })
    .join(', ');
}
