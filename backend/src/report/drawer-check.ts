import { formatCents, toCents } from '../common/money.js';
import type { PaymentMethodTotal } from './payment-totals.js';
import type { ReportPaymentMethodRow } from './report-source.js';

export type DrawerVerdict = 'MATCH' | 'OVER' | 'SHORT';

export interface DrawerToCountItem {
  paymentMethodId: number;
  name: string;
  isCash: boolean;
}

export interface DrawerCheckLine {
  paymentMethodId: number;
  name: string;
  expected: string;
  counted: string;
  difference: string;
  verdict: DrawerVerdict;
}

export interface DrawerCheck {
  countedBy: string;
  countedAt: string;
  note: string | null;
  lines: DrawerCheckLine[];
}

export interface DrawerReport {
  openingCash: string | null;
  cashTolerance: string;
  countRequired: boolean;
  toCount: DrawerToCountItem[];
  check: DrawerCheck | null;
}

export interface DrawerCheckInput {
  openingCash: string | null;
  cashTolerance: string;
  countRequired: boolean;
  paymentMethods: ReportPaymentMethodRow[];
  byPaymentMethod: PaymentMethodTotal[];
  counts: { paymentMethodId: number; amount: string }[];
  countedBy: string | null;
  countedAt: Date | null;
  note: string | null;
}

function determineVerdict(
  differenceCents: number,
  toleranceCents: number,
  isCash: boolean,
): DrawerVerdict {
  if (isCash && Math.abs(differenceCents) <= toleranceCents) return 'MATCH';
  if (!isCash && differenceCents === 0) return 'MATCH';
  return differenceCents > 0 ? 'OVER' : 'SHORT';
}

/**
 * Formas a contar: todas ativas não-fiado mais qualquer inativa com movimento, na ordem do cadastro.
 *
 * @example toCountPaymentMethods(methods, totals)
 */
export function toCountPaymentMethods(
  methods: ReportPaymentMethodRow[],
  byPaymentMethod: PaymentMethodTotal[],
): DrawerToCountItem[] {
  const movementIds = new Set(
    byPaymentMethod
      .filter((entry) => toCents(entry.total) > 0)
      .map((entry) => entry.paymentMethodId),
  );
  return methods
    .filter(
      (method) =>
        !method.isFiado && (method.active || movementIds.has(method.id)),
    )
    .map((method) => ({
      paymentMethodId: method.id,
      name: method.name,
      isCash: method.isCash,
    }));
}

function buildCheckLine(
  method: ReportPaymentMethodRow,
  expectedCents: number,
  countedCents: number,
  toleranceCents: number,
): DrawerCheckLine {
  const differenceCents = countedCents - expectedCents;
  return {
    paymentMethodId: method.id,
    name: method.name,
    expected: formatCents(expectedCents),
    counted: formatCents(countedCents),
    difference: formatCents(differenceCents),
    verdict: determineVerdict(differenceCents, toleranceCents, method.isCash),
  };
}

function buildCheckLines(
  methods: ReportPaymentMethodRow[],
  totalsMap: Map<number, number>,
  countsMap: Map<number, number>,
  openingCashCents: number,
  toleranceCents: number,
): DrawerCheckLine[] {
  const lines: DrawerCheckLine[] = [];
  for (const method of methods) {
    if (method.isFiado) continue;
    const baseExpected = totalsMap.get(method.id) ?? 0;
    const expectedCents = method.isCash
      ? baseExpected + openingCashCents
      : baseExpected;
    const hasCount = countsMap.has(method.id);
    if (!hasCount && expectedCents <= 0) continue;
    const countedCents = countsMap.get(method.id) ?? 0;
    lines.push(
      buildCheckLine(method, expectedCents, countedCents, toleranceCents),
    );
  }
  return lines;
}

const toTotalsMap = (totals: PaymentMethodTotal[]): Map<number, number> =>
  new Map(totals.map((item) => [item.paymentMethodId, toCents(item.total)]));

const toAmountsMap = (
  counts: { paymentMethodId: number; amount: string }[],
): Map<number, number> =>
  new Map(counts.map((item) => [item.paymentMethodId, toCents(item.amount)]));

function buildCheck(input: DrawerCheckInput, countedAt: Date): DrawerCheck {
  const openingCashCents = input.openingCash ? toCents(input.openingCash) : 0;
  const toleranceCents = toCents(input.cashTolerance);
  const lines = buildCheckLines(
    input.paymentMethods,
    toTotalsMap(input.byPaymentMethod),
    toAmountsMap(input.counts),
    openingCashCents,
    toleranceCents,
  );
  return {
    countedBy: input.countedBy ?? '',
    countedAt: countedAt.toISOString(),
    note: input.note,
    lines,
  };
}

/**
 * Monta o bloco drawer do relatório diário (conferência da gaveta, troco e tolerância).
 *
 * @example buildDrawerReport(input)
 */
export function buildDrawerReport(input: DrawerCheckInput): DrawerReport {
  return {
    openingCash: input.openingCash,
    cashTolerance: input.cashTolerance,
    countRequired: input.countRequired,
    toCount: toCountPaymentMethods(input.paymentMethods, input.byPaymentMethod),
    check: input.countedAt ? buildCheck(input, input.countedAt) : null,
  };
}
