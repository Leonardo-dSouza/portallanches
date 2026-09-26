import { formatMoney } from '../api/money';
import type { ProductApi } from '../api/product-api';
import type { Product } from '../api/types';
import { CmvGauge } from './CmvGauge';
import { EntryActions } from './EntryActions';
import { productInputOf } from './product-form-values';
import type { MenuSection } from './product-menu';
import { useRowAction, type RowContext } from './use-row-action';

interface MenuRowProps {
  product: Product;
  products: ProductApi;
  context: RowContext;
  selected: boolean;
  showIngredients: boolean;
  onEdit(product: Product): void;
}

function MenuRow(props: MenuRowProps) {
  const { product, products, context, selected, onEdit } = props;
  const { busy, run } = useRowAction(context);
  const toggleActive = () =>
    run(() =>
      products.saveProduct(product.id, {
        ...productInputOf(product),
        active: !product.active,
      }),
    );
  return (
    <tr
      className="menu-row"
      data-inactive={!product.active}
      data-selected={selected}
    >
      <td className="menu-number">
        {product.menuNumber !== null && <span>{product.menuNumber}</span>}
      </td>
      <td className="menu-item">
        <span className="menu-name">{product.name}</span>
        {!product.active && <span className="tag">Inativo</span>}
        {props.showIngredients && product.description && (
          <span className="menu-description">{product.description}</span>
        )}
      </td>
      <td className="menu-price">
        {product.salePrice === null ? '—' : formatMoney(product.salePrice)}
      </td>
      <td className="menu-cmv">
        <CmvGauge product={product} />
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

interface ProductMenuTableProps {
  sections: MenuSection[];
  products: ProductApi;
  context: RowContext;
  selectedId: number | null;
  showIngredients: boolean;
  onEdit(product: Product): void;
}

/** O cardápio como um quadro: uma seção por categoria, número, nome e ingredientes, preço e CMV. */
export function ProductMenuTable(props: ProductMenuTableProps) {
  const { sections, selectedId, ...rowProps } = props;
  return (
    <table className="menu-board-table">
      <thead className="sr-only">
        <tr>
          <th>Número</th>
          <th>Lanche</th>
          <th>Preço</th>
          <th>CMV</th>
          <th>Ações</th>
        </tr>
      </thead>
      {sections.map(({ category, products }) => (
        <tbody key={category.id}>
          <tr className="menu-section">
            <th colSpan={5} scope="rowgroup">
              {category.name}
              <span className="menu-section-count">{products.length}</span>
            </th>
          </tr>
          {products.map((product) => (
            <MenuRow
              key={product.id}
              product={product}
              selected={product.id === selectedId}
              {...rowProps}
            />
          ))}
        </tbody>
      ))}
    </table>
  );
}
