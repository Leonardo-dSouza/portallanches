import type { MenuItem } from './menu-lookup';
import {
  MAX_LINE_QUANTITY,
  type DraftAddon,
  type DraftLine,
} from './order-lines';

const MAX_NOTE_LENGTH = 120;

export { maxParentQuantity } from './order-lines';

/** Adicionais com `delta` aplicado ao produto; no zero ele sai, e o total cabe em 99. */
function addonsWith(
  line: DraftLine,
  item: MenuItem,
  delta: number,
): DraftAddon[] {
  const current = line.addons.find((a) => a.productId === item.id);
  const wanted = (current?.quantity ?? 0) + delta;
  if (wanted * line.quantity > MAX_LINE_QUANTITY) return line.addons;
  const others = line.addons.filter((a) => a.productId !== item.id);
  if (wanted <= 0) return others;
  const addon = {
    productId: item.id,
    name: item.name,
    unitPrice: item.salePrice,
  };
  return current
    ? line.addons.map((a) =>
        a.productId === item.id ? { ...a, quantity: wanted } : a,
      )
    : [...others, { ...addon, quantity: wanted }];
}

/**
 * Põe (`delta` 1) ou tira (`-1`) um adicional, por unidade, de uma linha da comanda.
 *
 * @example changeAddon(lines, line.id, bacon, 1)
 */
export function changeAddon(
  lines: DraftLine[],
  lineId: number,
  item: MenuItem,
  delta: number,
): DraftLine[] {
  return lines.map((line) =>
    line.id === lineId
      ? { ...line, addons: addonsWith(line, item, delta) }
      : line,
  );
}

/**
 * Observação da linha (aparada, até 120 caracteres; '' tira).
 *
 * @example setNote(lines, line.id, 'sem tomate')
 */
export function setNote(
  lines: DraftLine[],
  lineId: number,
  text: string,
): DraftLine[] {
  const note = text.trim().slice(0, MAX_NOTE_LENGTH);
  return lines.map((line) => (line.id === lineId ? { ...line, note } : line));
}
