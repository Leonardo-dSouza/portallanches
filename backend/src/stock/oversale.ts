/** Venda além do estoque ainda pendente (o que falta descontar, em milésimos). */
export interface PendingOversale {
  id: number;
  orderId: number | null;
  milli: number;
}

/** Quanto a entrada cobre de uma pendência e quanto dela continua pendente. */
export interface OversaleCover extends PendingOversale {
  leftMilli: number;
}

/**
 * A entrada nova desconta as vendas que passaram do saldo (decisão do usuário, 2026-10-09):
 * cobre da mais antiga para a mais nova até acabar o que entrou.
 *
 * @example settleOversales([{ id: 1, orderId: 10, milli: 2000 }], 12000) // [{ id: 1, orderId: 10, milli: 2000, leftMilli: 0 }]
 */
export function settleOversales(
  pending: PendingOversale[],
  availableMilli: number,
): OversaleCover[] {
  let available = availableMilli;
  const covers: OversaleCover[] = [];
  for (const row of pending) {
    const milli = Math.min(row.milli, available);
    if (milli <= 0) break;
    covers.push({ ...row, milli, leftMilli: row.milli - milli });
    available -= milli;
  }
  return covers;
}
