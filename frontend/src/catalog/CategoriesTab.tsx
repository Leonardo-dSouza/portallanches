import { useRef, useState } from 'react';
import type { CategoryInput, ProductApi } from '../api/product-api';
import type { ProductCategory } from '../api/types';
import { TextField } from '../components/TextField';
import { AddonCategorySelect } from './AddonCategorySelect';
import { CatalogTab } from './CatalogTab';
import { ChoiceCategorySelect } from './ChoiceCategorySelect';
import { ChoiceKeysOrder } from './ChoiceKeysOrder';
import { EntryActions } from './EntryActions';
import { InactiveTag } from './InactiveTag';
import { MoveButtons } from './MoveButtons';
import { parseEntryName } from './catalog-values';
import {
  formatCategoryPv,
  parseCategoryPercentages,
} from './category-pv-values';
import { inMenuOrder, isChoiceList, moveCategory } from './category-list';
import { NewEntryForm } from './NewEntryForm';
import { useCatalogList } from './use-catalog-list';
import { useRowAction, type RowContext } from './use-row-action';

interface CategoryRowProps {
  category: ProductCategory;
  all: ProductCategory[];
  products: ProductApi;
  context: RowContext;
}

/**
 * A escolha obrigatória da categoria (2026-11-08) ou, se ela é a lista de uma escolha (o Pão),
 * a ordem das teclas das opções dela.
 */
function ChoiceCell(props: CategoryRowProps) {
  const { category, all, products, context } = props;
  if (isChoiceList(all, category))
    return (
      <ChoiceKeysOrder
        category={category}
        products={products}
        context={context}
      />
    );
  return <ChoiceCategorySelect {...props} />;
}

interface CategoryPvInputsProps {
  name: string;
  fixedCost: string;
  profit: string;
  onFixedCostChange(value: string): void;
  onProfitChange(value: string): void;
}

function CategoryPvInputs(props: CategoryPvInputsProps) {
  return (
    <div className="category-pv-edit">
      <input
        className="cell-input"
        aria-label={`Custo fixo % de ${props.name}`}
        placeholder="Custo fixo %"
        value={props.fixedCost}
        onChange={(event) => props.onFixedCostChange(event.target.value)}
      />
      <input
        className="cell-input"
        aria-label={`Lucro desejado % de ${props.name}`}
        placeholder="Lucro desejado %"
        value={props.profit}
        onChange={(event) => props.onProfitChange(event.target.value)}
      />
    </div>
  );
}

function CategoryRow(props: CategoryRowProps) {
  const { category, all, products, context } = props;
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(category.name);
  const [fixedCost, setFixedCost] = useState(
    category.fixedCostPercent?.replace('.', ',') ?? '',
  );
  const [profit, setProfit] = useState(
    category.profitPercent?.replace('.', ',') ?? '',
  );
  const { busy, run } = useRowAction(context);

  const move = (direction: -1 | 1) => {
    const ids = moveCategory(all, category.id, direction);
    if (!ids) return null;
    return () => void run(() => products.reorderCategories(ids));
  };

  const startEditing = () => {
    setName(category.name);
    setFixedCost(category.fixedCostPercent?.replace('.', ',') ?? '');
    setProfit(category.profitPercent?.replace('.', ',') ?? '');
    setEditing(true);
  };

  const save = async () => {
    const parsedName = parseEntryName(name, 'nome da categoria');
    if (!parsedName.ok) return context.onError(parsedName.error);
    const parsedPv = parseCategoryPercentages(fixedCost, profit);
    if (!parsedPv.ok) return context.onError(parsedPv.error);
    const ok = await run(() =>
      products.updateCategory(category.id, {
        name: parsedName.value,
        active: category.active,
        fixedCostPercent: parsedPv.value.fixedCostPercent,
        profitPercent: parsedPv.value.profitPercent,
      }),
    );
    if (ok) setEditing(false);
  };

  const toggleActive = () =>
    run(() =>
      products.updateCategory(category.id, {
        name: category.name,
        active: !category.active,
      }),
    );

  return (
    <tr data-inactive={!category.active}>
      <td>
        {editing ? (
          <input
            className="cell-input"
            aria-label={`Nome da categoria ${category.name}`}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        ) : (
          <>
            {category.name}
            <InactiveTag active={category.active} />
          </>
        )}
      </td>
      <td>
        {editing ? (
          <CategoryPvInputs
            name={category.name}
            fixedCost={fixedCost}
            profit={profit}
            onFixedCostChange={setFixedCost}
            onProfitChange={setProfit}
          />
        ) : (
          formatCategoryPv(category)
        )}
      </td>
      <td>
        <AddonCategorySelect
          category={category}
          all={all}
          products={products}
          context={context}
        />
      </td>
      <td>
        <ChoiceCell
          category={category}
          all={all}
          products={products}
          context={context}
        />
      </td>
      <td>
        <MoveButtons
          name={category.name}
          busy={busy}
          onUp={move(-1)}
          onDown={move(1)}
        />
      </td>
      <td className="row-actions">
        <EntryActions
          name={category.name}
          editing={editing}
          active={category.active}
          busy={busy}
          onEdit={startEditing}
          onSave={() => void save()}
          onCancel={() => setEditing(false)}
          onToggleActive={() => void toggleActive()}
        />
      </td>
    </tr>
  );
}

interface NewCategoryFormProps {
  context: RowContext;
  create(input: CategoryInput): Promise<unknown>;
}

function NewCategoryForm({ context, create }: NewCategoryFormProps) {
  const [name, setName] = useState('');
  const [fixedCost, setFixedCost] = useState('');
  const [profit, setProfit] = useState('');
  const nameRef = useRef<HTMLInputElement>(null);
  const { busy, run } = useRowAction(context);

  const submit = async () => {
    const parsedName = parseEntryName(name, 'nome da categoria');
    if (!parsedName.ok) return context.onError(parsedName.error);
    const parsedPv = parseCategoryPercentages(fixedCost, profit);
    if (!parsedPv.ok) return context.onError(parsedPv.error);
    const ok = await run(() =>
      create({
        name: parsedName.value,
        fixedCostPercent: parsedPv.value.fixedCostPercent,
        profitPercent: parsedPv.value.profitPercent,
      }),
    );
    if (!ok) return;
    setName('');
    setFixedCost('');
    setProfit('');
    nameRef.current?.focus();
  };

  return (
    <NewEntryForm
      title="Nova categoria"
      submitLabel="Adicionar categoria"
      busy={busy}
      onSubmit={() => void submit()}
    >
      <TextField
        label="Nome da categoria"
        ref={nameRef}
        value={name}
        onChange={setName}
      />
      <TextField
        label="Custo fixo %"
        inputMode="decimal"
        value={fixedCost}
        onChange={setFixedCost}
      />
      <TextField
        label="Lucro desejado %"
        inputMode="decimal"
        value={profit}
        onChange={setProfit}
      />
    </NewEntryForm>
  );
}

/**
 * Categorias do cardápio (pedido do usuário, 2026-10-09: "Combos", "Porções"): criar, ordenar
 * e desativar.
 */
export function CategoriesTab({ products }: { products: ProductApi }) {
  const list = useCatalogList(products.listCategories);
  const all = list.items ?? [];
  const row = (category: ProductCategory, context: RowContext) => (
    <CategoryRow
      key={category.id}
      category={category}
      all={all}
      products={products}
      context={context}
    />
  );
  return (
    <CatalogTab
      noun="categorias"
      hint="A ordem vale para o quadro do Cardápio e para a Análise. Desativar tira a categoria da ficha do item e dos filtros, sem desativar os itens dela. Adicionais: de qual categoria o caixa oferece os adicionais dos itens (Tradicional → Adicionais; Açaí → Adicionais do açaí). Escolha obrigatória: o caixa pergunta 1 item dessa categoria ao lançar e não salva sem ele (Artesanal → Pão); na categoria da escolha, a ordem das opções é a das teclas 1, 2, 3."
      list={list}
      labelOf={(category) => category.name}
      columns={
        <>
          <th>Categoria</th>
          <th>PV sugerido</th>
          <th>Adicionais</th>
          <th>Escolha obrigatória</th>
          <th>Ordem</th>
          <th />
        </>
      }
      newLabel="Nova categoria"
      renderForm={(context) => (
        <NewCategoryForm context={context} create={products.createCategory} />
      )}
      renderRow={row}
      // A tabela segue a ordem do cardápio, não a alfabética do CatalogTab.
      order={inMenuOrder}
    />
  );
}
