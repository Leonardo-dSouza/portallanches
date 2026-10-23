/** Venda além do estoque ainda pendente (o que falta descontar, em milésimos). */
export interface PendingOversale {
  id: number;
  milli: number;
}

/** Quanto a entrada cobre de uma pendência (com o dono dela) e quanto continua pendente. */
export type OversaleCover<T extends PendingOversale> = T & {
  leftMilli: number;
};

/**
 * A entrada nova desconta as vendas que passaram do saldo (decisão do usuário, 2026-10-09):
 * cobre da mais antiga para a mais nova até acabar o que entrou.
 *
 * @example settleOversales([{ id: 1, orderId: 10, milli: 2000 }], 12000) // [{ id: 1, orderId: 10, milli: 2000, leftMilli: 0 }]
 */
export function settleOversales<T extends PendingOversale>(
  pending: T[],
  availableMilli: number,
): OversaleCover<T>[] {
  let available = availableMilli;
  const covers: OversaleCover<T>[] = [];
  for (const row of pending) {
    const milli = Math.min(row.milli, available);
    if (milli <= 0) break;
    covers.push({ ...row, milli, leftMilli: row.milli - milli });
    available -= milli;
  }
  return covers;
}
