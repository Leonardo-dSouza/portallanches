import type { KeyboardEvent, RefObject } from 'react';
import { formatMoney } from '../api/money';
import {
  optionsOf,
  type ItemPreview,
  type PreviewOptions,
} from './item-preview';
import type { MenuItem } from './menu-lookup';
import { stockLeftLabel } from './stock-notice';
import type { OrderItemsState } from './use-order-items';

interface OrderItemFieldProps {
  items: OrderItemsState;
  inputRef: RefObject<HTMLInputElement | null>;
  /** Enter com o campo vazio: o caixa terminou os itens. */
  onDone(): void;
}

const LIST_ID = 'order-item-results';
const optionId = (index: number) => `order-item-option-${index}`;

/** "X Salada · Artesanal" — a categoria desfaz a dúvida entre números repetidos; bebida com
 * saldo baixo mostra quanto resta. */
function ItemLabel({ item }: { item: MenuItem }) {
  return (
    <>
      {item.menuNumber !== null && (
        <span className="menu-number-chip">{item.menuNumber}</span>
      )}
      <span className="order-item-name">{item.name}</span>
      <span className="order-item-category">{item.categoryName}</span>
      {item.stockLeft !== null && (
        <span className="order-item-stock" data-empty={item.stockLeft === 0}>
          {stockLeftLabel(item.stockLeft)}
        </span>
      )}
      <span className="order-item-price">{formatMoney(item.salePrice)}</span>
    </>
  );
}

function PreviewLine({
  preview,
  items,
}: {
  preview: ItemPreview;
  items: OrderItemsState;
}) {
  if (items.problem)
    return (
      <p className="order-item-preview" data-tone="problem" role="alert">
        {items.problem}
      </p>
    );
  if (preview.kind === 'problem')
    return (
      <p className="order-item-preview" data-tone="muted">
        {preview.message}
      </p>
    );
  if (preview.kind === 'adjust')
    return (
      <p className="order-item-preview" data-tone="muted">
        <kbd aria-hidden>Enter</kbd>{' '}
        {preview.delta > 0 ? 'mais um' : 'menos um'} no último item
      </p>
    );
  return null;
}

/** Opções clicáveis: o item achado pelo número (uma só) ou a lista da busca. */
function ResultList({
  options,
  items,
}: {
  options: PreviewOptions | null;
  items: OrderItemsState;
}) {
  if (!options) return null;
  return (
    <ul
      className="order-item-results"
      id={LIST_ID}
      role="listbox"
      aria-label="Itens encontrados"
    >
      {options.items.map((item, index) => (
        <li
          key={item.id}
          id={optionId(index)}
          role="option"
          aria-selected={index === options.active}
          // mousedown (não click): o campo não perde o foco antes de escolher.
          onMouseDown={(event) => {
            event.preventDefault();
            items.pick(item);
          }}
        >
          {index === options.active && <kbd aria-hidden>Enter</kbd>}
          {options.quantity > 1 && <strong>{options.quantity}×</strong>}
          <ItemLabel item={item} />
        </li>
      ))}
    </ul>
  );
}

function itemKeyHandler(items: OrderItemsState, onDone: () => void) {
  return (event: KeyboardEvent<HTMLInputElement>) => {
    const empty = items.text === '';
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      items.moveActive(event.key === 'ArrowDown' ? 1 : -1);
    } else if (event.key === 'Escape') {
      items.setText('');
    } else if (empty && (event.key === '+' || event.key === '-')) {
      // Do bloco numérico, sem Enter: mexe na quantidade da última linha na hora.
      event.preventDefault();
      items.adjustLast(event.key === '+' ? 1 : -1);
    } else if (event.key === 'Enter' && !event.ctrlKey) {
      event.preventDefault();
      if (items.enter() === 'done') onDone();
    }
  };
}

/**
 * Campo "Item" da comanda: número (9), artesanal com ponto (9.), quantidade com * (2*9) ou
 * parte do nome (coca). A prévia mostra o que o Enter vai pôr antes de pôr.
 */
export function OrderItemField({
  items,
  inputRef,
  onDone,
}: OrderItemFieldProps) {
  const { preview } = items;
  const options = optionsOf(preview);
  const open = options !== null;
  return (
    <div className="order-item-field">
      <label className="field">
        Item
        <input
          ref={inputRef}
          role="combobox"
          aria-expanded={open}
          aria-controls={open ? LIST_ID : undefined}
          aria-activedescendant={options ? optionId(options.active) : undefined}
          aria-autocomplete="list"
          autoComplete="off"
          placeholder="9 · 9. artesanal · 2*9 · nome"
          value={items.text}
          onChange={(event) => items.setText(event.target.value)}
          onKeyDown={itemKeyHandler(items, onDone)}
        />
      </label>
      <PreviewLine preview={preview} items={items} />
      <ResultList options={options} items={items} />
    </div>
  );
}
