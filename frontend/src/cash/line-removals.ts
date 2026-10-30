import type { DraftLine } from './order-lines';
import type { RemovalChoice } from './removal-lookup';

const isRemoved = (line: DraftLine, supplyId: number) =>
  line.removals.some((removal) => removal.supplyId === supplyId);

/**
 * A tecla fica ligada só com todos os ingredientes dela retirados: com só o tomate retirado, o
 * Tomate liga e a Salada, não.
 *
 * @example choiceRemoved(line, salada) // true
 */
export function choiceRemoved(line: DraftLine, choice: RemovalChoice): boolean {
  return choice.supplies.every((supply) => isRemoved(line, supply.supplyId));
}

function removalsToggled(line: DraftLine, choice: RemovalChoice) {
  if (choiceRemoved(line, choice)) {
    const ids = choice.supplies.map((supply) => supply.supplyId);
    return line.removals.filter((r) => !ids.includes(r.supplyId));
  }
  const missing = choice.supplies.filter(
    (supply) => !isRemoved(line, supply.supplyId),
  );
  return [...line.removals, ...missing];
}

/**
 * Tira da linha o que a tecla representa ou, se já está tudo tirado, devolve (pedido do usuário,
 * 2026-10-30: a Salada tira os dois, e `-tomate` só o tomate).
 *
 * @example toggleRemoval(lines, line.id, tomate)
 */
export function toggleRemoval(
  lines: DraftLine[],
  lineId: number,
  choice: RemovalChoice,
): DraftLine[] {
  return lines.map((line) =>
    line.id === lineId
      ? { ...line, removals: removalsToggled(line, choice) }
      : line,
  );
}
