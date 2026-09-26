import { useState } from 'react';
import type { ProductApi } from '../api/product-api';
import type { Product } from '../api/types';
import {
  buildProductInput,
  EMPTY_COMPONENT,
  EMPTY_PRODUCT_FORM,
  productFormValuesOf,
  type ComponentRowValues,
  type ProductFormValues,
} from './product-form-values';
import { replaceRowField, withoutRow } from './row-list';
import { useRowAction, type RowContext } from './use-row-action';

type ProductField = Exclude<keyof ProductFormValues, 'components'>;

export interface ProductFormState {
  values: ProductFormValues;
  busy: boolean;
  setField(field: ProductField, value: string): void;
  setComponent(
    index: number,
    field: keyof ComponentRowValues,
    value: string,
  ): void;
  addComponent(): void;
  removeComponent(index: number): void;
  submit(): Promise<void>;
}

interface UseProductFormArgs {
  products: ProductApi;
  /** Produto em edição; null = cadastro de um novo. */
  editing: Product | null;
  context: RowContext;
  /** Depois de gravar: sai da edição (o formulário volta para "novo"). */
  onDone(): void;
}

/**
 * Estado do formulário de lanche (novo ou edição) com as linhas da composição.
 *
 * @example const form = useProductForm({ products, editing: null, context, onDone });
 */
export function useProductForm(args: UseProductFormArgs): ProductFormState {
  const { products, editing, context, onDone } = args;
  const [values, setValues] = useState(() =>
    editing ? productFormValuesOf(editing) : EMPTY_PRODUCT_FORM,
  );
  const { busy, run } = useRowAction(context);
  const updateComponents = (
    change: (rows: ComponentRowValues[]) => ComponentRowValues[],
  ) =>
    setValues((current) => ({
      ...current,
      components: change(current.components),
    }));

  const submit = async () => {
    const built = buildProductInput(values, editing?.active ?? true);
    if (!built.ok) return context.onError(built.error);
    const saved = await run(() =>
      products.saveProduct(editing?.id ?? null, built.value),
    );
    if (!saved) return;
    // Mantém a categoria: o admin costuma cadastrar vários lanches da mesma em sequência.
    setValues({ ...EMPTY_PRODUCT_FORM, categoryId: values.categoryId });
    onDone();
  };

  return {
    values,
    busy,
    setField: (field, value) =>
      setValues((current) => ({ ...current, [field]: value })),
    setComponent: (index, field, value) =>
      updateComponents((rows) => replaceRowField(rows, index, field, value)),
    addComponent: () => updateComponents((rows) => [...rows, EMPTY_COMPONENT]),
    removeComponent: (index) =>
      updateComponents((rows) => withoutRow(rows, index)),
    submit,
  };
}
