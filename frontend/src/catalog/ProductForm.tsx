import { Check, Plus, X } from 'lucide-react';
import type { FormEvent } from 'react';
import type { ProductApi } from '../api/product-api';
import type { Product, ProductCategory, Supply } from '../api/types';
import { SelectField } from '../components/SelectField';
import { TextField } from '../components/TextField';
import { unitOfSupply } from './product-form-values';
import type { RowContext } from './use-row-action';
import { useProductForm, type ProductFormState } from './use-product-form';

interface ProductFormProps {
  products: ProductApi;
  categories: ProductCategory[];
  supplies: Supply[];
  editing: Product | null;
  context: RowContext;
  onDone(): void;
}

interface ComponentRowsProps {
  form: ProductFormState;
  supplies: Supply[];
}

function ComponentRow({
  form,
  supplies,
  index,
}: ComponentRowsProps & { index: number }) {
  const row = form.values.components[index];
  return (
    <div className="package-row component-row">
      <SelectField
        label={`Insumo ${index + 1}`}
        value={row.supplyId}
        options={supplies.map((s) => ({ value: String(s.id), label: s.name }))}
        onChange={(value) => form.setComponent(index, 'supplyId', value)}
      />
      <TextField
        label={`Quantidade ${index + 1} (${unitOfSupply(supplies, row.supplyId)})`}
        inputMode="decimal"
        value={row.quantity}
        onChange={(value) => form.setComponent(index, 'quantity', value)}
      />
      <button
        type="button"
        className="button-ghost button-danger"
        aria-label={`Remover insumo ${index + 1}`}
        onClick={() => form.removeComponent(index)}
      >
        <X aria-hidden />
      </button>
    </div>
  );
}

function ComponentRows({ form, supplies }: ComponentRowsProps) {
  return (
    <fieldset className="package-rows">
      <legend>Composição</legend>
      <p className="hint">
        Quanto de cada insumo vai no lanche, na unidade de contagem dele (ex.:
        0,036 kg de queijo). Embalagens também contam.
      </p>
      {form.values.components.map((_, index) => (
        <ComponentRow
          key={index}
          form={form}
          supplies={supplies}
          index={index}
        />
      ))}
      <button
        type="button"
        className="button-ghost"
        onClick={form.addComponent}
      >
        <Plus aria-hidden />
        Adicionar insumo
      </button>
    </fieldset>
  );
}

function ProductMainFields(props: {
  form: ProductFormState;
  categories: ProductCategory[];
}) {
  const { form, categories } = props;
  return (
    <div className="product-fields">
      <SelectField
        label="Categoria"
        value={form.values.categoryId}
        options={categories.map((c) => ({
          value: String(c.id),
          label: c.name,
        }))}
        onChange={(value) => form.setField('categoryId', value)}
      />
      <TextField
        label="Nome do lanche"
        value={form.values.name}
        onChange={(value) => form.setField('name', value)}
      />
      <TextField
        label="Preço de venda (opcional)"
        inputMode="decimal"
        value={form.values.salePrice}
        onChange={(value) => form.setField('salePrice', value)}
      />
      <TextField
        label="Descrição (opcional)"
        value={form.values.description}
        onChange={(value) => form.setField('description', value)}
      />
    </div>
  );
}

/** Cadastro e edição de lanche: dados principais em linha e composição abaixo. */
export function ProductForm(props: ProductFormProps) {
  const form = useProductForm(props);
  const { editing, onDone } = props;
  const submit = (event: FormEvent) => {
    event.preventDefault();
    void form.submit();
  };
  return (
    <form className="card supply-form" onSubmit={submit}>
      <h2>{editing ? `Editar ${editing.name}` : 'Novo lanche'}</h2>
      <ProductMainFields form={form} categories={props.categories} />
      <ComponentRows form={form} supplies={props.supplies} />
      <div className="supply-form-actions">
        {editing && (
          <button
            type="button"
            className="button button-secondary"
            onClick={onDone}
          >
            Cancelar edição
          </button>
        )}
        <button
          type="submit"
          className="button"
          disabled={form.busy}
          aria-busy={form.busy}
        >
          {editing ? <Check aria-hidden /> : <Plus aria-hidden />}
          {editing ? 'Salvar alterações' : 'Adicionar lanche'}
        </button>
      </div>
    </form>
  );
}
