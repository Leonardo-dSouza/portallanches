import {
  formatQuantity,
  multiplyQuantities,
  toApiQuantity,
} from '../api/quantity';
import type { StockEntryInput, Supply } from '../api/types';
import type { Parsed } from '../catalog/catalog-values';
import { parseDateKey } from '../history/date-keys';

/** Campos da entrada como digitados; `packageName` vazio = unidade de contagem. */
export interface EntryFormValues {
  supplyId: string;
  amount: string;
  packageName: string;
  expiresOn: string;
}

export const EMPTY_ENTRY_FORM: EntryFormValues = {
  supplyId: '',
  amount: '',
  packageName: '',
  expiresOn: '',
};

const fail = (error: string) => ({ ok: false, error }) as const;

/**
 * Valida a entrada. A validade é opcional (sacolas, embalagens) e pode estar no passado
 * só por engano, então isso fica para o alerta de "vencido" mostrar.
 *
 * @example buildEntryInput({ supplyId: '3', amount: '2', packageName: 'fardo', expiresOn: '2026-10-15' })
 */
export function buildEntryInput(
  values: EntryFormValues,
): Parsed<StockEntryInput> {
  if (!values.supplyId) return fail('Escolha o insumo');
  const amount = toApiQuantity(values.amount);
  if (amount === null || !/[1-9]/.test(amount))
    return fail(
      `Quantidade inválida "${values.amount}": digite um número maior que zero (ex.: 2 ou 1,5)`,
    );
  if (values.expiresOn && !parseDateKey(values.expiresOn))
    return fail(
      `Validade inválida "${values.expiresOn}": escolha um dia do calendário`,
    );
  return {
    ok: true,
    value: {
      supplyId: Number(values.supplyId),
      amount,
      packageName: values.packageName || null,
      expiresOn: values.expiresOn || null,
    },
  };
}

/**
 * Quanto a entrada soma no estoque, na unidade de contagem (só para mostrar antes de salvar).
 *
 * @example entryPreview({ ...values, amount: '2', packageName: 'fardo' }, soda) // '12 un'
 */
export function entryPreview(
  values: EntryFormValues,
  supply: Supply | undefined,
): string | null {
  const amount = toApiQuantity(values.amount);
  if (!supply || amount === null) return null;
  const found = supply.packages.find((p) => p.name === values.packageName);
  const total = found ? multiplyQuantities(amount, found.quantity) : amount;
  return total === null ? null : `${formatQuantity(total)} ${supply.countUnit}`;
}
