import { Info } from 'lucide-react';
import { formatMoney } from '../api/money';
import type { ProductApi } from '../api/product-api';
import type { Product } from '../api/types';
import { EntryActions } from './EntryActions';
import { describeCmvPercent, productInputOf } from './product-form-values';
import type { MenuSection } from './product-menu';
import { useRowAction, type RowContext } from './use-row-action';

/** O que o quadro mostra além de número, nome e preço (escolhido em "Mostrar"). */
export interface MenuDisplay {
  showIngredients: boolean;
  showCosts: boolean;
}

const HELP = {
  price: 'Preço cobrado do cliente, vindo do PV da planilha de custos.',
  cmv: 'Custo da mercadoria vendida: soma de quantidade × custo de cada insumo da composição, com o custo atual cadastrado em Insumos.',
  cmvPercent:
    'CMV dividido pelo preço de venda. A planilha de custos calcula o preço para o CMV ficar em 42%.',
} as const;

function ColumnHelp({ label, help }: { label: string; help: string }) {
  return (
    <span
      className="column-help"
      tabIndex={0}
      role="img"
      aria-label={`O que é ${label}: ${help}`}
      data-help={help}
    >
      <Info aria-hidden />
    </span>
  );
}

function CostCells({ product }: { product: Product }) {
  return (
    <>
      <td className="menu-cost">
        {formatMoney(product.cmv)}
        {!product.cmvComplete && (
          <span
            className="cmv-incomplete"
            title="Algum insumo da composição está sem custo"
          >
            incompleto
          </span>
        )}
      </td>
      <td className="menu-cost">{describeCmvPercent(product.cmvPercent)}</td>
    </>
  );
}

interface MenuRowProps {
  product: Product;
  products: ProductApi;
  context: RowContext;
  selected: boolean;
  display: MenuDisplay;
  onEdit(product: Product): void;
}

function MenuRow(props: MenuRowProps) {
  const { product, products, context, selected, display, onEdit } = props;
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
        {/* Sem número (bebidas, adicionais) fica a plaquinha vazia: a coluna segue alinhada. */}
        {product.menuNumber === null ? (
          <span className="menu-plate-blank" aria-hidden />
        ) : (
          <span>{product.menuNumber}</span>
        )}
      </td>
      <td className="menu-item">
        <span className="menu-name">{product.name}</span>
        {!product.active && <span className="tag">Inativo</span>}
        {display.showIngredients && product.description && (
          <span className="menu-description">{product.description}</span>
        )}
      </td>
      <td className="menu-price">
        {product.salePrice === null ? '—' : formatMoney(product.salePrice)}
      </td>
      {display.showCosts && <CostCells product={product} />}
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

function MenuHead({ showCosts }: { showCosts: boolean }) {
  return (
    <thead className="menu-head">
      <tr>
        <th>Nº</th>
        <th>Item</th>
        <th className="num">
          Preço de venda
          <ColumnHelp label="Preço de venda" help={HELP.price} />
        </th>
        {showCosts && (
          <>
            <th className="num menu-cost-head">
              CMV
              <ColumnHelp label="CMV" help={HELP.cmv} />
            </th>
            <th className="num menu-cost-head">
              CMV %
              <ColumnHelp label="CMV %" help={HELP.cmvPercent} />
            </th>
          </>
        )}
        <th>
          <span className="sr-only">Ações</span>
        </th>
      </tr>
    </thead>
  );
}

interface ProductMenuTableProps {
  sections: MenuSection[];
  products: ProductApi;
  context: RowContext;
  selectedId: number | null;
  display: MenuDisplay;
  onEdit(product: Product): void;
}

/** O cardápio como um quadro: uma seção por categoria, número, nome e preço; custos sob demanda. */
export function ProductMenuTable(props: ProductMenuTableProps) {
  const { sections, selectedId, ...rowProps } = props;
  const columns = props.display.showCosts ? 6 : 4;
  return (
    <table className="menu-board-table">
      <MenuHead showCosts={props.display.showCosts} />
      {sections.map(({ category, products }) => (
        <tbody key={category.id}>
          <tr className="menu-section">
            <th colSpan={columns} scope="rowgroup">
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
