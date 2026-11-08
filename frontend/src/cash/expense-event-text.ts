import { formatMoney } from '../api/money';
import type { ExpenseEvent, ExpenseSnapshot } from '../api/expense-event-types';
import type { ExpenseType } from '../api/types';

const ROLE_LABEL = { CAIXA: 'caixa', ADMIN: 'admin' } as const;

function typeNameOf(id: number, types: ExpenseType[]): string {
  return types.find((t) => t.id === id)?.name ?? `Tipo ${id}`;
}

function invoiceSummary(snapshot: ExpenseSnapshot): string | null {
  if (!snapshot.invoice) return null;
  const outside =
    snapshot.invoice.outsideCount > 0
      ? ` (${snapshot.invoice.outsideCount} fora)`
      : '';
  return `${snapshot.invoice.vendorName}${outside}`;
}

function changePairs(
  before: ExpenseSnapshot,
  after: ExpenseSnapshot,
  types: ExpenseType[],
): [string, string][] {
  const pairs: [string, string][] = [];
  if (before.amount !== after.amount) {
    pairs.push([formatMoney(before.amount), formatMoney(after.amount)]);
  }
  if (before.expenseTypeId !== after.expenseTypeId) {
    pairs.push([
      typeNameOf(before.expenseTypeId, types),
      typeNameOf(after.expenseTypeId, types),
    ]);
  }
  if ((before.description ?? '') !== (after.description ?? '')) {
    pairs.push([
      before.description || 'sem descrição',
      after.description || 'sem descrição',
    ]);
  }
  if (
    before.paymentLabel !== after.paymentLabel &&
    (before.paymentLabel || after.paymentLabel)
  ) {
    pairs.push([
      before.paymentLabel || 'sem forma',
      after.paymentLabel || 'sem forma',
    ]);
  }
  const beforeInv = before.invoice;
  const afterInv = after.invoice;
  if (!beforeInv && afterInv) {
    pairs.push(['sem nota', `nota anexada (${invoiceSummary(after)})`]);
  } else if (beforeInv && !afterInv) {
    pairs.push(['com nota', 'nota tirada']);
  } else if (beforeInv && afterInv) {
    if (beforeInv.vendorName !== afterInv.vendorName) {
      pairs.push([beforeInv.vendorName, afterInv.vendorName]);
    }
    if (beforeInv.outsideCount !== afterInv.outsideCount) {
      pairs.push([
        `${beforeInv.outsideCount} fora`,
        `${afterInv.outsideCount} fora`,
      ]);
    }
  }
  return pairs;
}

function changesText(
  before: ExpenseSnapshot,
  after: ExpenseSnapshot,
  types: ExpenseType[],
): string {
  const pairs = changePairs(before, after, types);
  if (pairs.length === 0)
    return 'sem mudanças de valor, tipo, descrição ou nota';
  return pairs.map(([was, now]) => `${was} → ${now}`).join(' · ');
}

function detailsText(event: ExpenseEvent, types: ExpenseType[]): string {
  const { details } = event;
  if (details.kind === 'CREATED') {
    const { expense } = details;
    const inv = invoiceSummary(expense);
    const withInv = inv ? ` · nota: ${inv}` : '';
    const desc = expense.description ? ` · ${expense.description}` : '';
    return `Lançado: ${formatMoney(expense.amount)} · ${typeNameOf(expense.expenseTypeId, types)}${desc}${withInv}`;
  }
  if (details.kind === 'EDITED') {
    return `Alterado: ${changesText(details.before, details.after, types)}`;
  }
  if (details.kind === 'CANCELED') {
    return details.reason ? `Cancelado: ${details.reason}` : 'Cancelado';
  }
  return 'Cancelamento desfeito';
}

/**
 * Um passo do histórico do gasto em uma linha, com o perfil de quem fez.
 *
 * @example eventText(event, types) // 'Alterado: R$ 50,00 → R$ 60,00 (admin)'
 */
export function eventText(event: ExpenseEvent, types: ExpenseType[]): string {
  const who = ROLE_LABEL[event.userRole];
  return `${detailsText(event, types)} (${who})`;
}
