import type { OrderItem } from '../api/types';
import type { MenuItem } from './menu-lookup';

/** Adicional na linha, com a quantidade por unidade do item (2× X Salada + bacon = 2 bacon). */
export interface DraftAddon {
  productId: number;
  name: string;
  unitPrice: string;
  quantity: number;
}

/** Linha da comanda enquanto o caixa digita (o preço é o do cadastro ou o da época). */
export interface DraftLine {
  /** Só da tela: o mesmo produto pode estar em várias linhas (puro e com bacon). */
  id: number;
  productId: number;
  name: string;
  menuNumber: number | null;
  categoryName: string;
  unitPrice: string;
  quantity: number;
  /** Observação para a comanda; '' = nenhuma. */
  note: string;
  addons: DraftAddon[];
}

export const MAX_LINE_QUANTITY = 99;

const isPlain = (line: DraftLine) =>
  line.addons.length === 0 && line.note === '';

const nextLineId = (lines: DraftLine[]) =>
  Math.max(0, ...lines.map((line) => line.id)) + 1;

/** Linha nova; o preço de um produto que já está na comanda é o mesmo (o da época, na edição). */
function newLine(
  lines: DraftLine[],
  item: MenuItem,
  quantity: number,
): DraftLine {
  const samePrice = lines.find((line) => line.productId === item.id)?.unitPrice;
  return {
    id: nextLineId(lines),
    productId: item.id,
    name: item.name,
    menuNumber: item.menuNumber,
    categoryName: item.categoryName,
    unitPrice: samePrice ?? item.salePrice,
    quantity: Math.min(quantity, MAX_LINE_QUANTITY),
    note: '',
    addons: [],
  };
}

/**
 * Põe o item na comanda. Repetido soma na linha dele sem adicional e sem observação, que vai
 * para o fim (o "+"/"-" do teclado age no que acabou de ser digitado); com adicional, nasce
 * outra linha.
 *
 * @example addLine([], xSalada, 2)[0].quantity // 2
 */
export function addLine(
  lines: DraftLine[],
  item: MenuItem,
  quantity: number,
): DraftLine[] {
  const existing = lines.find((l) => l.productId === item.id && isPlain(l));
  if (!existing) return [...lines, newLine(lines, item, quantity)];
  const total = Math.min(existing.quantity + quantity, MAX_LINE_QUANTITY);
  const others = lines.filter((line) => line.id !== existing.id);
  return [...others, { ...existing, quantity: total }];
}

/** Maior quantidade da linha com cada adicional cabendo em 99 no total. */
export function maxParentQuantity(line: DraftLine): number {
  const perUnit = Math.max(1, ...line.addons.map((addon) => addon.quantity));
  return Math.floor(MAX_LINE_QUANTITY / perUnit);
}

/**
 * Soma `delta` na quantidade de uma linha; no zero ela sai.
 *
 * @example changeQuantity(lines, line.id, -1)
 */
export function changeQuantity(
  lines: DraftLine[],
  lineId: number,
  delta: number,
): DraftLine[] {
  return lines
    .map((line) =>
      line.id === lineId
        ? {
            ...line,
            quantity: Math.min(line.quantity + delta, maxParentQuantity(line)),
          }
        : line,
    )
    .filter((line) => line.quantity > 0);
}

/** "+"/"-" com o campo vazio: mexe na última linha. */
export function adjustLast(lines: DraftLine[], delta: number): DraftLine[] {
  const last = lines.at(-1);
  return last ? changeQuantity(lines, last.id, delta) : lines;
}

/** `'17.80'` → 1780, sem float. */
function centsOf(money: string): number {
  const [integerPart, cents = ''] = money.split('.');
  return Number(integerPart) * 100 + Number(cents.padEnd(2, '0').slice(0, 2));
}

/** Uma unidade do item com os adicionais dela, em centavos. */
const unitCents = (line: DraftLine) =>
  line.addons.reduce(
    (sum, addon) => sum + addon.quantity * centsOf(addon.unitPrice),
    centsOf(line.unitPrice),
  );

/**
 * Prévia do total enquanto digita (itens com adicionais + taxa), em centavos inteiros. É só
 * para mostrar: o valor gravado é o que a API calcula com o preço do cadastro.
 *
 * @example previewTotalCents(lines, '4.50') // 6490
 */
export function previewTotalCents(lines: DraftLine[], fee: string): number {
  const items = lines.reduce(
    (sum, line) => sum + line.quantity * unitCents(line),
    0,
  );
  return items + (fee ? centsOf(fee) : 0);
}

/** Centavos inteiros → formato da API (`6490` → `'64.90'`), para `formatMoney`. */
export function centsToMoney(cents: number): string {
  return `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, '0')}`;
}

/** Subtotal da linha (quantidade × item com adicionais), só para mostrar. */
export function lineTotal(line: DraftLine): string {
  return centsToMoney(line.quantity * unitCents(line));
}

/**
 * Nome da linha para os botões: com o mesmo produto em mais de uma linha, entra o número
 * dela ("X Salada (linha 2)"), para cada botão ter nome único.
 *
 * @example lineLabel(lines, lines[1]) // 'X Salada (linha 2)'
 */
export function lineLabel(lines: DraftLine[], line: DraftLine): string {
  const same = lines.filter(
    (other) =>
      other.name === line.name && other.categoryName === line.categoryName,
  );
  if (same.length < 2) return line.name;
  return `${line.name} (linha ${same.indexOf(line) + 1})`;
}

/** Linhas de um pedido gravado, para editar (mantêm o preço da época; adicional por unidade). */
export function linesOfOrder(items: OrderItem[]): DraftLine[] {
  return items.map((item, index) => ({
    id: index + 1,
    productId: item.productId,
    name: item.productName,
    menuNumber: item.menuNumber,
    categoryName: item.categoryName,
    unitPrice: item.unitPrice,
    quantity: item.quantity,
    note: item.note ?? '',
    addons: item.addons.map((addon) => ({
      productId: addon.productId,
      name: addon.productName,
      unitPrice: addon.unitPrice,
      quantity: addon.quantity / item.quantity,
    })),
  }));
}
