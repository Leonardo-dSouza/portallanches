import { maxParentQuantity, type DraftLine } from './order-lines';

/** Produto, adicionais por unidade (em qualquer ordem) e observação: o que faz duas linhas iguais. */
function lineKey(line: DraftLine): string {
  const addons = line.addons
    .map((addon) => `${addon.productId}x${addon.quantity}`)
    .sort()
    .join(',');
  return `${line.productId}|${addons}|${line.note}`;
}

/** Soma a linha na primeira igual que tiver espaço; o que não couber vira linha no fim. */
function mergeInto(merged: DraftLine[], line: DraftLine): DraftLine[] {
  const key = lineKey(line);
  let left = line.quantity;
  const next = merged.map((target) => {
    if (left === 0 || lineKey(target) !== key) return target;
    const taken = Math.min(left, maxParentQuantity(target) - target.quantity);
    left -= taken;
    return { ...target, quantity: target.quantity + taken };
  });
  return left > 0 ? [...next, { ...line, quantity: left }] : next;
}

/**
 * Junta as linhas idênticas da comanda antes de salvar (decisão do usuário, 2026-10-10): na
 * tela cada Enter é uma linha, para o adicional seguinte não vazar para outro item; no pedido,
 * "2× Açaí + leite em pó" fica numa linha só. Linhas diferentes ficam na ordem em que entraram.
 *
 * @example mergeIdenticalLines([coca1, salada1, coca2]).map((l) => l.quantity) // [2, 1]
 */
export function mergeIdenticalLines(lines: DraftLine[]): DraftLine[] {
  return lines.reduce(mergeInto, []);
}
