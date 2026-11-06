import { formatMoney } from '../api/money';
import { isArtisanal } from './artisanal';
import { MenuNumberChip } from './MenuNumberChip';
import { categoriesOf, quantityInOrder, visibleItems } from './menu-grid';
import type { MenuItem } from './menu-lookup';
import type { DraftLine } from './order-lines';
import { stockLeftLabel } from './stock-notice';

interface MenuGridProps {
  /** Cardápio completo do dia; a ordem define a sequência de categorias. */
  menu: MenuItem[];
  /** Linhas atuais da comanda, para calcular o selo de quantidade. */
  lines: DraftLine[];
  /** Texto digitado no campo de busca (pode ser nome ou número). */
  searchText: string;
  /** Categoria selecionada no momento (chip ativo). */
  activeCategory: string;
  /** Callback quando o usuário muda de categoria. */
  onCategoryChange(category: string): void;
  /** Callback para adicionar um item (um toque = 1 unidade). */
  onPick(item: MenuItem): void;
}

/** Chips de categoria que rolam horizontalmente; o ativo fica destacado. */
function CategoryChips({
  categories,
  active,
  onSelect,
}: {
  categories: string[];
  active: string;
  onSelect(category: string): void;
}) {
  return (
    <div className="menu-grid-categories tabs" role="tablist" aria-label="Categorias">
      {categories.map((cat) => (
        <button
          key={cat}
          type="button"
          role="tab"
          aria-selected={cat === active}
          className={cat === active ? 'tab-button active' : 'tab-button'}
          onClick={() => onSelect(cat)}
        >
          {cat}
        </button>
      ))}
    </div>
  );
}

interface MenuItemButtonProps {
  item: MenuItem;
  quantity: number;
  onPick(item: MenuItem): void;
}

/** Botão de um item da grade: número do cardápio, nome (até 2 linhas), preço e selo de qtd. */
function MenuItemButton({ item, quantity, onPick }: MenuItemButtonProps) {
  return (
    <button
      type="button"
      className="menu-grid-item"
      onClick={() => onPick(item)}
      aria-label={`${item.name} ${formatMoney(item.salePrice)}${quantity > 0 ? `, ${quantity} na comanda` : ''}`}
    >
      {item.menuNumber !== null && (
        <MenuNumberChip number={item.menuNumber} categoryName={item.categoryName} />
      )}
      {quantity > 0 && (
        <span className="menu-grid-qty" aria-hidden>
          {quantity}
        </span>
      )}
      <span className="menu-grid-name">{item.name}</span>
      {item.stockLeft !== null && (
        <span
          className="menu-grid-stock"
          data-empty={item.stockLeft === 0}
          aria-hidden
        >
          {stockLeftLabel(item.stockLeft)}
        </span>
      )}
      <span
        className="menu-grid-price"
        data-artisanal={isArtisanal(item.categoryName) || undefined}
      >
        {formatMoney(item.salePrice)}
      </span>
    </button>
  );
}

/**
 * Grade de itens do cardápio para o modo garçom no celular (2026-11-05): chips de categoria
 * que rolam de lado + grade de botões grandes. Um toque adiciona 1 ao pedido.
 */
export function MenuGrid({
  menu,
  lines,
  searchText,
  activeCategory,
  onCategoryChange,
  onPick,
}: MenuGridProps) {
  const categories = categoriesOf(menu);
  const items = visibleItems(menu, searchText, activeCategory);
  const isSearching = searchText.trim().length > 0;

  return (
    <div className="menu-grid">
      {!isSearching && (
        <CategoryChips
          categories={categories}
          active={activeCategory}
          onSelect={onCategoryChange}
        />
      )}
      {items.length === 0 ? (
        <p className="menu-grid-empty">
          {isSearching
            ? 'Nenhum item encontrado.'
            : 'Sem itens nesta categoria.'}
        </p>
      ) : (
        <div className="menu-grid-items" role="list" aria-label="Itens do cardápio">
          {items.map((item) => (
            <MenuItemButton
              key={item.id}
              item={item}
              quantity={quantityInOrder(lines, item.id)}
              onPick={onPick}
            />
          ))}
        </div>
      )}
    </div>
  );
}
