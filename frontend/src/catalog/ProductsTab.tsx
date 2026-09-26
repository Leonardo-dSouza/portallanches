import { useState } from 'react';
import { formatMoney } from '../api/money';
import type { ProductApi } from '../api/product-api';
import type { SupplyApi } from '../api/supply-api';
import type { Product, ProductCategory, Supply } from '../api/types';
import { Skeleton } from '../components/Skeleton';
import { CatalogTab } from './CatalogTab';
import { EntryActions } from './EntryActions';
import { LoadFailure } from './LoadFailure';
import { ProductForm } from './ProductForm';
import {
  describeCmvPercent,
  productInputOf,
  productSortKey,
} from './product-form-values';
import { useCatalogList } from './use-catalog-list';
import { useRowAction, type RowContext } from './use-row-action';

interface ProductRowProps {
  product: Product;
  products: ProductApi;
  context: RowContext;
  onEdit(product: Product): void;
}

function CmvCell({ product }: { product: Product }) {
  return (
    <td className="num">
      {formatMoney(product.cmv)}
      {!product.cmvComplete && (
        <span
          className="tag"
          data-status="CLOSED"
          title="Algum insumo da composição está sem custo"
        >
          incompleto
        </span>
      )}
    </td>
  );
}

function ProductRow({ product, products, context, onEdit }: ProductRowProps) {
  const { busy, run } = useRowAction(context);
  const toggleActive = () =>
    run(() =>
      products.saveProduct(product.id, {
        ...productInputOf(product),
        active: !product.active,
      }),
    );
  return (
    <tr data-inactive={!product.active}>
      <td className="strong">{product.name}</td>
      <td>{product.categoryName}</td>
      <td className="num">
        {product.salePrice === null ? '—' : formatMoney(product.salePrice)}
      </td>
      <CmvCell product={product} />
      <td className="num">{describeCmvPercent(product.cmvPercent)}</td>
      <td>
        <span className="tag" data-status={product.active ? 'OPEN' : 'CLOSED'}>
          {product.active ? 'Ativo' : 'Inativo'}
        </span>
      </td>
      <td className="row-actions">
        <EntryActions
          name={product.name}
          editing={false}
          active={product.active}
          busy={busy}
          onEdit={() => onEdit(product)}
          onSave={() => undefined}
          onCancel={() => undefined}
          onToggleActive={() => void toggleActive()}
        />
      </td>
    </tr>
  );
}

const COLUMNS = (
  <>
    <th>Lanche</th>
    <th>Categoria</th>
    <th className="num">Preço</th>
    <th className="num">CMV</th>
    <th className="num">CMV %</th>
    <th>Situação</th>
    <th />
  </>
);

interface ProductListProps {
  products: ProductApi;
  categories: ProductCategory[];
  supplies: Supply[];
}

function ProductList({ products, categories, supplies }: ProductListProps) {
  const list = useCatalogList(products.listProducts);
  const [editing, setEditing] = useState<Product | null>(null);
  return (
    <CatalogTab
      noun="lanches"
      hint="CMV = soma de quantidade × custo de cada insumo, com o custo atual cadastrado em Insumos. CMV % = CMV ÷ preço de venda (a planilha mira 42%)."
      list={list}
      labelOf={(product) => productSortKey(product, categories)}
      columns={COLUMNS}
      renderForm={(context) => (
        <ProductForm
          key={editing?.id ?? 'novo'}
          products={products}
          categories={categories}
          supplies={supplies.filter((s) => s.active)}
          editing={editing}
          context={context}
          onDone={() => setEditing(null)}
        />
      )}
      renderRow={(product, context) => (
        <ProductRow
          key={product.id}
          product={product}
          products={products}
          context={context}
          onEdit={setEditing}
        />
      )}
    />
  );
}

/** Lanches do cardápio: espera categorias e insumos (opções do formulário) antes da lista. */
export function ProductsTab(props: {
  products: ProductApi;
  supplies: SupplyApi;
}) {
  const categories = useCatalogList(props.products.listCategories);
  const supplies = useCatalogList(props.supplies.listSupplies);
  const failure = categories.error ?? supplies.error;
  if (failure)
    return (
      <LoadFailure
        message={failure}
        onRetry={() => {
          categories.reload();
          supplies.reload();
        }}
      />
    );
  if (!categories.items || !supplies.items)
    return <Skeleton label="Carregando lanches…" rows={4} />;
  return (
    <ProductList
      products={props.products}
      categories={categories.items}
      supplies={supplies.items}
    />
  );
}
