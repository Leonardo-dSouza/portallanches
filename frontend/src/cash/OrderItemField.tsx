import type { KeyboardEvent, RefObject } from 'react';
import { formatMoney } from '../api/money';
import type { ItemPreview } from './item-preview';
import type { MenuItem } from './menu-lookup';
import type { OrderItemsState } from './use-order-items';

interface OrderItemFieldProps {
  items: OrderItemsState;
  inputRef: RefObject<HTMLInputElement | null>;
  /** Enter com o campo vazio: o caixa terminou os itens. */
  onDone(): void;
}

const LIST_ID = 'order-item-results';
const optionId = (index: number) => `order-item-option-${index}`;

/** "X Salada · Artesanal" — a categoria desfaz a dúvida entre números repetidos. */
function ItemLabel({ item }: { item: MenuItem }) {
  return (
    <>
      {item.menuNumber !== null && (
        <span className="menu-number-chip">{item.menuNumber}</span>
      )}
      <span className="order-item-name">{item.name}</span>
      <span className="order-item-category">{item.categoryName}</span>
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
  if (preview.kind === 'item')
    return (
      <p className="order-item-preview" data-tone="match">
        <kbd aria-hidden>Enter</kbd>
        {preview.quantity > 1 && <strong>{preview.quantity}×</strong>}
        <ItemLabel item={preview.item} />
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

function ResultList({
  preview,
  items,
}: {
  preview: ItemPreview;
  items: OrderItemsState;
}) {
  if (preview.kind !== 'results') return null;
  return (
    <ul
      className="order-item-results"
      id={LIST_ID}
      role="listbox"
      aria-label="Itens encontrados"
    >
      {preview.items.map((item, index) => (
        <li
          key={item.id}
          id={optionId(index)}
          role="option"
          aria-selected={index === preview.active}
          // mousedown (não click): o campo não perde o foco antes de escolher.
          onMouseDown={(event) => {
            event.preventDefault();
            items.pick(item);
          }}
        >
          {preview.quantity > 1 && <strong>{preview.quantity}×</strong>}
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
  const open = preview.kind === 'results';
  return (
    <div className="order-item-field">
      <label className="field">
        Item
        <input
          ref={inputRef}
          role="combobox"
          aria-expanded={open}
          aria-controls={open ? LIST_ID : undefined}
          aria-activedescendant={open ? optionId(preview.active) : undefined}
          aria-autocomplete="list"
          autoComplete="off"
          placeholder="9 · 9. artesanal · 2*9 · nome"
          value={items.text}
          onChange={(event) => items.setText(event.target.value)}
          onKeyDown={itemKeyHandler(items, onDone)}
        />
      </label>
      <PreviewLine preview={preview} items={items} />
      <ResultList preview={preview} items={items} />
    </div>
  );
}
