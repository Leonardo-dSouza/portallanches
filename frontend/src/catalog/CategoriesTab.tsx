import type { ProductApi } from '../api/product-api';
import type { ProductCategory } from '../api/types';
import { CatalogTab } from './CatalogTab';
import { CategoryMoveButtons } from './CategoryMoveButtons';
import { inMenuOrder, moveCategory } from './category-list';
import { NamedEntryRow } from './NamedEntryRow';
import { NewNameForm } from './NewNameForm';
import { useCatalogList } from './use-catalog-list';
import { useRowAction, type RowContext } from './use-row-action';

const LOCKED_NAME =
  'Vem da planilha: a importação procura a categoria por este nome.';

interface CategoryRowProps {
  category: ProductCategory;
  all: ProductCategory[];
  products: ProductApi;
  context: RowContext;
}

function CategoryRow({ category, all, products, context }: CategoryRowProps) {
  const { busy, run } = useRowAction(context);
  const move = (direction: -1 | 1) => {
    const ids = moveCategory(all, category.id, direction);
    if (!ids) return null;
    return () => void run(() => products.reorderCategories(ids));
  };
  return (
    <NamedEntryRow
      entry={category}
      what="categoria"
      fieldLabel="Nome da categoria"
      context={context}
      save={(next) => products.updateCategory(category.id, next)}
      editLockedReason={category.importLocked ? LOCKED_NAME : undefined}
      orderControls={
        <CategoryMoveButtons
          name={category.name}
          busy={busy}
          onUp={move(-1)}
          onDown={move(1)}
        />
      }
    />
  );
}

/**
 * Categorias do cardápio (pedido do usuário, 2026-10-09: "Combos", "Porções"): criar, ordenar
 * e desativar. As que vêm das planilhas não mudam de nome.
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
      hint="A ordem vale para o quadro do Cardápio e para a Análise. Desativar tira a categoria da ficha do item e dos filtros, sem desativar os itens dela. Categorias das planilhas (Tradicional, Refrigerantes…) não mudam de nome."
      list={list}
      labelOf={(category) => category.name}
      columns={
        <>
          <th>Categoria</th>
          <th>Situação</th>
          <th>Ordem</th>
          <th />
        </>
      }
      renderForm={(context) => (
        <NewNameForm
          title="Nova categoria"
          fieldLabel="Nome da categoria"
          submitLabel="Adicionar categoria"
          what="da categoria"
          context={context}
          create={products.createCategory}
        />
      )}
      renderRow={row}
      // A tabela segue a ordem do cardápio, não a alfabética do CatalogTab.
      renderBody={(visible, context) => (
        <tbody>{inMenuOrder(visible).map((c) => row(c, context))}</tbody>
      )}
    />
  );
}
