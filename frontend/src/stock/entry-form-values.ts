import { toApiMoney } from '../api/money';
import {
  formatQuantity,
  multiplyQuantities,
  toApiQuantity,
} from '../api/quantity';
import type { PaidPer, StockEntryInput, Supply } from '../api/types';
import type { Parsed } from '../catalog/catalog-values';
import { parseDateKey } from '../history/date-keys';

/** Uma linha da grade de compra, como digitada; `packageName` vazio = unidade de contagem. */
export interface EntryRowValues {
  amount: string;
  packageName: string;
  expiresOn: string;
  paid: string;
  paidPer: PaidPer;
}

export const BLANK_ENTRY_ROW: EntryRowValues = {
  amount: '',
  packageName: '',
  expiresOn: '',
  paid: '',
  paidPer: 'total',
};

const fail = (error: string) => ({ ok: false, error }) as const;

/** Linha tocada: algo além do padrão foi digitado (só ela entra na compra ou dá erro). */
export function isRowTouched(row: EntryRowValues): boolean {
  return Boolean(row.amount.trim() || row.paid.trim() || row.expiresOn);
}

function parseAmount(row: EntryRowValues, name: string): Parsed<string> {
  const amount = toApiQuantity(row.amount);
  if (amount !== null && /[1-9]/.test(amount))
    return { ok: true, value: amount };
  return fail(
    `${name}: quantidade inválida "${row.amount}", digite um número maior que zero (ex.: 2 ou 1,5)`,
  );
}

function parsePaid(row: EntryRowValues, name: string): Parsed<string | null> {
  if (!row.paid.trim()) return { ok: true, value: null };
  const paid = toApiMoney(row.paid);
  if (paid !== null) return { ok: true, value: paid };
  return fail(
    `${name}: valor pago inválido "${row.paid}", digite só números com até 2 casas (ex.: 25,90)`,
  );
}

/**
 * Valida uma linha da compra. A validade é opcional (sacolas, embalagens) e pode estar no
 * passado só por engano, então isso fica para o alerta de "vencido" mostrar.
 *
 * @example buildEntryItem(3, 'Coca 2L', { ...BLANK_ENTRY_ROW, amount: '2', packageName: 'fardo', paid: '50' })
 */
export function buildEntryItem(
  supplyId: number,
  name: string,
  row: EntryRowValues,
): Parsed<StockEntryInput> {
  const amount = parseAmount(row, name);
  if (!amount.ok) return amount;
  if (row.expiresOn && !parseDateKey(row.expiresOn))
    return fail(
      `${name}: validade inválida "${row.expiresOn}", escolha um dia do calendário`,
    );
  const paid = parsePaid(row, name);
  if (!paid.ok) return paid;
  const { packageName, expiresOn, paidPer } = row;
  return {
    ok: true,
    value: {
      supplyId,
      amount: amount.value,
      packageName: packageName || null,
      expiresOn: expiresOn || null,
      paid: paid.value,
      paidPer,
    },
  };
}

/**
 * A compra inteira: só as linhas tocadas, na ordem da grade; o primeiro erro para tudo.
 *
 * @example buildEntryItems(rows, (id) => supplies.find((s) => s.id === id)?.name ?? `#${id}`)
 */
export function buildEntryItems(
  rows: Map<number, EntryRowValues>,
  nameOf: (supplyId: number) => string,
): Parsed<StockEntryInput[]> {
  const items: StockEntryInput[] = [];
  for (const [supplyId, row] of rows) {
    if (!isRowTouched(row)) continue;
    const item = buildEntryItem(supplyId, nameOf(supplyId), row);
    if (!item.ok) return item;
    items.push(item.value);
  }
  if (items.length > 0) return { ok: true, value: items };
  return fail('Digite a quantidade de ao menos um insumo');
}

/**
 * Quanto a linha soma no estoque, na unidade de contagem (só para mostrar antes de salvar).
 *
 * @example entryPreview({ ...BLANK_ENTRY_ROW, amount: '2', packageName: 'fardo' }, soda) // '12 un'
 */
export function entryPreview(
  row: EntryRowValues,
  supply: Supply | undefined,
): string | null {
  const amount = toApiQuantity(row.amount);
  if (!supply || amount === null) return null;
  const found = supply.packages.find((p) => p.name === row.packageName);
  const total = found ? multiplyQuantities(amount, found.quantity) : amount;
  return total === null ? null : `${formatQuantity(total)} ${supply.countUnit}`;
}
