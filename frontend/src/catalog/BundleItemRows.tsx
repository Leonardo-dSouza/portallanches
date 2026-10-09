import { Plus, X } from 'lucide-react';
import type { Product } from '../api/types';
import { SelectField } from '../components/SelectField';
import { TextField } from '../components/TextField';
import type { ProductFormState } from './use-product-form';

interface BundleItemRowsProps {
  form: ProductFormState;
  /** Produtos que podem entrar no combo (ativos, que não são combos). */
  options: Product[];
}

function BundleItemRow({
  form,
  options,
  index,
}: BundleItemRowsProps & { index: number }) {
  const row = form.values.bundleItems[index];
  return (
    <div className="package-row component-row">
      <SelectField
        label={`Item ${index + 1}`}
        value={row.productId}
        options={options.map((p) => ({ value: String(p.id), label: p.name }))}
        onChange={(value) => form.setBundleRow(index, 'productId', value)}
      />
      <TextField
        label={`Quantidade do item ${index + 1}`}
        inputMode="numeric"
        value={row.quantity}
        onChange={(value) => form.setBundleRow(index, 'quantity', value)}
      />
      <button
        type="button"
        className="button-ghost button-danger"
        aria-label={`Remover item ${index + 1}`}
        onClick={() => form.removeBundleRow(index)}
      >
        <X aria-hidden />
      </button>
    </div>
  );
}

/** Itens fixos do combo (pedido do usuário, 2026-10-09: "1 X Salada + 1 Guaraná lata"). */
export function BundleItemRows({ form, options }: BundleItemRowsProps) {
  return (
    <fieldset className="package-rows">
      <legend>Itens do combo</legend>
      <p className="hint">
        O preço é o do combo. O CMV e a baixa no estoque saem da composição de
        cada item.
      </p>
      {form.values.bundleItems.map((_, index) => (
        <BundleItemRow
          key={index}
          form={form}
          options={options}
          index={index}
        />
      ))}
      <button
        type="button"
        className="button-ghost"
        onClick={form.addBundleRow}
      >
        <Plus aria-hidden />
        Adicionar item ao combo
      </button>
    </fieldset>
  );
}
