import type { KeyboardEvent, RefObject } from 'react';
import { formatMoney } from '../api/money';
import {
  optionsOf,
  type ItemPreview,
  type PreviewOptions,
} from './item-preview';
import type { MenuItem } from './menu-lookup';
import { NUMPAD_ADJUST, quantityKeyAction } from './quantity-keys';
import { stockLeftLabel } from './stock-notice';
import type { OrderItemsState } from './use-order-items';

type InputRef = RefObject<HTMLInputElement | null>;

interface OrderItemFieldProps {
  items: OrderItemsState;
  /** Campo Qtd: o começo de cada item (o foco volta para ele depois de cada linha). */
  quantityRef: InputRef;
  inputRef: InputRef;
  /** Enter com o Qtd e o Item vazios: o caixa terminou os itens. */
  onDone(): void;
}

const LIST_ID = 'order-item-results';
const focusOn = (ref: InputRef) => ref.current?.focus();
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
  if (preview.kind === 'note')
    return (
      <p className="order-item-preview" data-tone="match">
        <kbd aria-hidden>Enter</kbd>{' '}
        {preview.note
          ? `Observação em ${preview.line.name}: ${preview.note}`
          : `Tirar a observação de ${preview.line.name}`}
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
  quantityRef,
}: {
  options: PreviewOptions | null;
  items: OrderItemsState;
  quantityRef: InputRef;
}) {
  if (!options) return null;
  const { preview } = items;
  const label =
    preview.kind === 'addons'
      ? `Adicionais de ${preview.line.name}`
      : 'Itens encontrados';
  return (
    <ul
      className="order-item-results"
      id={LIST_ID}
      role="listbox"
      aria-label={label}
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
            focusOn(quantityRef);
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

/**
 * Enter no Item: a linha entra e o foco volta ao Qtd; vazio com o Qtd preenchido volta ao Qtd;
 * vazio com o Qtd vazio segue para o pagamento.
 */
function enterItem(props: OrderItemFieldProps): void {
  const { items, quantityRef, onDone } = props;
  if (items.text === '' && items.quantity !== '') return focusOn(quantityRef);
  const result = items.enter();
  if (result === 'added') focusOn(quantityRef);
  if (result === 'done') onDone();
}

function handleItemKey(
  event: KeyboardEvent<HTMLInputElement>,
  props: OrderItemFieldProps,
): void {
  const { items } = props;
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault();
    items.moveActive(event.key === 'ArrowDown' ? 1 : -1);
  } else if (event.key === 'Escape') {
    items.setText('');
  } else if (items.text === '' && NUMPAD_ADJUST[event.code]) {
    // Só o "+"/"-" do bloco numérico mexe na última linha na hora; o "+" do teclado
    // principal escreve, para dar o "+bacon" (2026-10-09). "+" e Enter também ajusta.
    event.preventDefault();
    items.adjustLast(NUMPAD_ADJUST[event.code]);
  } else if (event.key === 'Enter' && !event.ctrlKey) {
    event.preventDefault();
    enterItem(props);
  }
}

/** Teclas do Qtd: ver `quantityKeyAction` (Enter/"*" vão ao Item, letra já começa nele). */
function handleQuantityKey(
  event: KeyboardEvent<HTMLInputElement>,
  { items, inputRef }: OrderItemFieldProps,
): void {
  const action = quantityKeyAction(event, items.quantity);
  if (!action) return;
  event.preventDefault();
  if (action.kind === 'adjust') items.adjustLast(action.delta);
  if (action.kind === 'forward')
    items.startItem(action.itemText, action.quantity);
  if (action.kind !== 'adjust' && action.kind !== 'block') focusOn(inputRef);
}

/**
 * Campos Qtd e "Item" da comanda. Item: número (9), artesanal com ponto (9.), quantidade com *
 * (2*9), parte do nome (coca), adicional na última linha (+bacon) ou a observação dela
 * (/sem tomate). A prévia mostra o que o Enter vai pôr antes de pôr.
 */
export function OrderItemField(props: OrderItemFieldProps) {
  const { items, quantityRef, inputRef } = props;
  const { preview } = items;
  const options = optionsOf(preview);
  const open = options !== null;
  return (
    <div className="order-item-field">
      <div className="order-item-entry">
        <label className="field">
          Qtd
          <input
            ref={quantityRef}
            inputMode="numeric"
            autoComplete="off"
            placeholder="1"
            value={items.quantity}
            onChange={(event) => items.setQuantity(event.target.value)}
            onKeyDown={(event) => handleQuantityKey(event, props)}
          />
        </label>
        <label className="field">
          Item
          <input
            ref={inputRef}
            role="combobox"
            aria-expanded={open}
            aria-controls={open ? LIST_ID : undefined}
            aria-activedescendant={
              options ? optionId(options.active) : undefined
            }
            aria-autocomplete="list"
            autoComplete="off"
            placeholder="9 · 9. artesanal · 2*9 · nome · +bacon · /obs"
            value={items.text}
            onChange={(event) => items.setText(event.target.value)}
            onKeyDown={(event) => handleItemKey(event, props)}
          />
        </label>
      </div>
      <PreviewLine preview={preview} items={items} />
      <ResultList options={options} items={items} quantityRef={quantityRef} />
    </div>
  );
}
