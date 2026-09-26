import { useState } from 'react';
import type { SupplyApi } from '../api/supply-api';
import type { Supply } from '../api/types';
import {
  buildSupplyInput,
  EMPTY_PACKAGE,
  EMPTY_SUPPLY_FORM,
  supplyFormValuesOf,
  type PackageRowValues,
  type SupplyFormValues,
} from './supply-form-values';
import { useRowAction, type RowContext } from './use-row-action';

type SupplyField = Exclude<keyof SupplyFormValues, 'packages' | 'deductOnSale'>;

export interface SupplyFormState {
  values: SupplyFormValues;
  busy: boolean;
  setField(field: SupplyField, value: string): void;
  setDeductOnSale(value: boolean): void;
  setPackage(index: number, field: keyof PackageRowValues, value: string): void;
  addPackage(): void;
  removePackage(index: number): void;
  submit(): Promise<void>;
}

interface UseSupplyFormArgs {
  supplies: SupplyApi;
  /** Insumo em edição; null = cadastro de um novo. */
  editing: Supply | null;
  context: RowContext;
  /** Depois de gravar: sai da edição (o formulário volta para "novo"). */
  onDone(): void;
}

/**
 * Estado do formulário de insumo (novo ou edição) com a lista de embalagens.
 *
 * @example const form = useSupplyForm({ supplies, editing: null, context, onDone });
 */
export function useSupplyForm(args: UseSupplyFormArgs): SupplyFormState {
  const { supplies, editing, context, onDone } = args;
  const [values, setValues] = useState(() =>
    editing ? supplyFormValuesOf(editing) : EMPTY_SUPPLY_FORM,
  );
  const { busy, run } = useRowAction(context);
  const updatePackages = (
    change: (rows: PackageRowValues[]) => PackageRowValues[],
  ) =>
    setValues((current) => ({
      ...current,
      packages: change(current.packages),
    }));

  const submit = async () => {
    const built = buildSupplyInput(values, editing?.active ?? true);
    if (!built.ok) return context.onError(built.error);
    const saved = await run(() =>
      supplies.saveSupply(editing?.id ?? null, built.value),
    );
    if (!saved) return;
    setValues(EMPTY_SUPPLY_FORM);
    onDone();
  };

  return {
    values,
    busy,
    setField: (field, value) =>
      setValues((current) => ({ ...current, [field]: value })),
    setDeductOnSale: (value) =>
      setValues((current) => ({ ...current, deductOnSale: value })),
    setPackage: (index, field, value) =>
      updatePackages((rows) =>
        rows.map((row, i) => (i === index ? { ...row, [field]: value } : row)),
      ),
    addPackage: () => updatePackages((rows) => [...rows, EMPTY_PACKAGE]),
    removePackage: (index) =>
      updatePackages((rows) => rows.filter((_, i) => i !== index)),
    submit,
  };
}
