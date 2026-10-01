import { useState } from 'react';
import type { ProductApi } from '../api/product-api';
import type { SupplyApi } from '../api/supply-api';
import type { Product, ProductCategory, Supply } from '../api/types';
import { EmptyState } from '../components/EmptyState';
import { Skeleton } from '../components/Skeleton';
import { LoadFailure } from './LoadFailure';
import { ProductForm } from './ProductForm';
import { ProductMenuTable } from './ProductMenuTable';
import { ProductToolbar } from './ProductToolbar';
import {
  countByCategory,
  EMPTY_MENU_FILTER,
  filterMenu,
  menuSections,
  type MenuFilter,
} from './product-menu';
import { useCatalogList } from './use-catalog-list';
import type { RowContext } from './use-row-action';

/** Produto aberto no painel: um existente, `'new'` para cadastrar, ou null (painel fechado). */
type Editing = Product | 'new' | null;

interface MenuBoardProps {
  products: ProductApi;
  categories: ProductCategory[];
  supplies: Supply[];
}

function EditorPanel(
  props: MenuBoardProps & {
    editing: Product | 'new';
    error: string | null;
    context: RowContext;
    onClose(): void;
  },
) {
  const { editing, error, onClose } = props;
  const product = editing === 'new' ? null : editing;
  return (
    <aside
      className="menu-editor"
      aria-label={product ? `Ficha de ${product.name}` : 'Ficha de item novo'}
    >
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <ProductForm
        key={product?.id ?? 'novo'}
        products={props.products}
        categories={props.categories}
        supplies={props.supplies.filter((s) => s.active)}
        editing={product}
        context={props.context}
        // Lanche novo: o painel fica aberto para cadastrar o próximo em sequência.
        onDone={product ? onClose : () => undefined}
        onClose={onClose}
      />
    </aside>
  );
}

function MenuBoard(props: MenuBoardProps) {
  const list = useCatalogList(props.products.listProducts);
  const [editing, setEditing] = useState<Editing>(null);
  const [filter, setFilter] = useState<MenuFilter>(EMPTY_MENU_FILTER);
  const [error, setError] = useState<string | null>(null);
  if (list.error)
    return <LoadFailure message={list.error} onRetry={list.reload} />;
  if (!list.items) return <Skeleton label="Carregando cardápio…" rows={6} />;
  const context: RowContext = {
    onSaved: () => {
      setError(null);
      list.reload();
    },
    onError: setError,
  };
  const open = (next: Editing) => {
    setError(null);
    setEditing(next);
  };
  const sections = menuSections(
    filterMenu(list.items, filter),
    props.categories,
  );
  return (
    <div className="menu-board" data-editing={editing !== null}>
      <div className="menu-board-main">
        <ProductToolbar
          categories={props.categories}
          filter={filter}
          counts={countByCategory(list.items, filter)}
          onChange={setFilter}
          onNew={() => open('new')}
        />
        {error && !editing && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        {sections.length === 0 ? (
          <EmptyState
            title="Nenhum item encontrado"
            hint={
              list.items.length === 0
                ? 'Use "Novo item" ou importe uma planilha na aba Importação.'
                : 'Mude a busca ou a categoria para ver outros itens.'
            }
          />
        ) : (
          <ProductMenuTable
            sections={sections}
            products={props.products}
            context={context}
            selectedId={editing && editing !== 'new' ? editing.id : null}
            display={filter}
            onEdit={open}
          />
        )}
      </div>
      {editing && (
        <EditorPanel
          {...props}
          editing={editing}
          error={error}
          context={context}
          onClose={() => open(null)}
        />
      )}
    </div>
  );
}

/** Lanches do cardápio: espera categorias e insumos (opções da ficha) antes do quadro. */
export function ProductsTab(props: {
  products: ProductApi;
  supplies: SupplyApi;
}) {
  const categories = useCatalogList(props.products.listCategories);
  const supplies = useCatalogList(props.supplies.listSupplies);
  const failure = categories.error ?? supplies.error;
  const retry = () => {
    categories.reload();
    supplies.reload();
  };
  if (failure) return <LoadFailure message={failure} onRetry={retry} />;
  if (!categories.items || !supplies.items)
    return <Skeleton label="Carregando cardápio…" rows={6} />;
  return (
    <MenuBoard
      products={props.products}
      categories={categories.items}
      supplies={supplies.items}
    />
  );
}
