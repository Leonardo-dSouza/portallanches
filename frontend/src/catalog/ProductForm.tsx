import { Check, Layers, Plus } from 'lucide-react';
import type { FormEvent } from 'react';
import type { ProductApi } from '../api/product-api';
import type { Product, ProductCategory, Supply } from '../api/types';
import { SelectField } from '../components/SelectField';
import { SwitchField } from '../components/SwitchField';
import { TextField } from '../components/TextField';
import { BundleItemRows } from './BundleItemRows';
import { selectableCategories } from './category-list';
import type { RowContext } from './use-row-action';
import { useProductForm, type ProductFormState } from './use-product-form';

interface ProductFormProps {
  products: ProductApi;
  categories: ProductCategory[];
  supplies?: Supply[];
  editing: Product | null;
  /** Produtos que podem entrar num combo (ativos, que não são combos, fora o próprio). */
  itemOptions: Product[];
  context: RowContext;
  /** Depois de gravar. */
  onDone(): void;
  /** Fecha a ficha sem gravar. */
  onClose(): void;
}

function ProductMainFields(props: {
  form: ProductFormState;
  categories: ProductCategory[];
}) {
  const { form, categories } = props;
  return (
    <div className="product-fields">
      {/* Combo não tem número: o caixa acha pela busca ("combo"). */}
      {!form.values.isCombo && (
        <TextField
          label="Nº no cardápio"
          inputMode="numeric"
          value={form.values.menuNumber}
          onChange={(value) => form.setField('menuNumber', value)}
        />
      )}
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
        label="Nome do item"
        value={form.values.name}
        onChange={(value) => form.setField('name', value)}
      />
      <TextField
        label="Preço de venda (opcional)"
        inputMode="decimal"
        value={form.values.salePrice}
        onChange={(value) => form.setField('salePrice', value)}
      />
      <p className="hint">
        O preço novo vale a partir de hoje: um caixa de dia anterior lançado
        depois continua com o preço antigo.
      </p>
      {!form.values.isCombo && (
        <ProfitTargetField form={form} categories={categories} />
      )}
      <TextField
        label="Descrição (opcional)"
        value={form.values.description}
        onChange={(value) => form.setField('description', value)}
      />
    </div>
  );
}

/** Meta de lucro própria do lanche; só em categoria com os % do preço sugerido. */
function ProfitTargetField(props: {
  form: ProductFormState;
  categories: ProductCategory[];
}) {
  const { form, categories } = props;
  const category = categories.find(
    (c) => String(c.id) === form.values.categoryId,
  );
  if (!category?.profitPercent) return null;
  const categoryTarget = category.profitPercent.replace('.', ',');
  return (
    <>
      <TextField
        label="Meta de lucro própria % (opcional)"
        inputMode="decimal"
        value={form.values.profitPercent}
        onChange={(value) => form.setField('profitPercent', value)}
      />
      <p className="hint">
        Vazio = usa a meta da categoria ({categoryTarget}%). Muda o preço
        sugerido em Custos, não o preço do cardápio.
      </p>
    </>
  );
}

/** Cadastro e edição de lanche: dados principais em linha e composição (ou itens do combo) abaixo. */
export function ProductForm(props: ProductFormProps) {
  const form = useProductForm(props);
  const { editing, onClose } = props;
  const submit = (event: FormEvent) => {
    event.preventDefault();
    void form.submit();
  };
  return (
    <form className="card supply-form product-form" onSubmit={submit}>
      <h2>{editing ? `Editar ${editing.name}` : 'Novo item'}</h2>
      <ProductMainFields
        form={form}
        categories={selectableCategories(
          props.categories,
          props.editing?.categoryId ?? null,
        )}
      />
      <SwitchField
        label="Combo (itens do cardápio com preço próprio)"
        Icon={Layers}
        checked={form.values.isCombo}
        onChange={form.setCombo}
      />
      {form.values.isCombo ? (
        <BundleItemRows form={form} options={props.itemOptions} />
      ) : (
        <p className="hint product-costs-link">
          <a href="/custos">Receita e custo ficam em Custos</a>
        </p>
      )}
      <div className="supply-form-actions">
        <button
          type="button"
          className="button button-secondary"
          onClick={onClose}
        >
          {editing ? 'Cancelar edição' : 'Fechar'}
        </button>
        <button
          type="submit"
          className="button"
          disabled={form.busy}
          aria-busy={form.busy}
        >
          {editing ? <Check aria-hidden /> : <Plus aria-hidden />}
          {editing ? 'Salvar alterações' : 'Adicionar item'}
        </button>
      </div>
    </form>
  );
}
