import { useEffect, type KeyboardEvent, type RefObject } from 'react';
import { formatMoney } from '../api/money';
import { isArtisanal } from './artisanal';
import { choiceRemoved } from './line-removals';
import {
  optionsOf,
  type ItemPreview,
  type PreviewOptions,
} from './item-preview';
import type { MenuItem } from './menu-lookup';
import { MenuNumberChip } from './MenuNumberChip';
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
  /**
   * No celular (2026-11-05): `true` esconde o campo Qtd, troca o placeholder do Item para
   * "Número ou nome" e ativa `enterKeyHint="enter"` para o teclado móvel exibir "Enter".
   */
  phoneMode?: boolean;
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
        <MenuNumberChip
          number={item.menuNumber}
          categoryName={item.categoryName}
        />
      )}
      <span className="order-item-name">{item.name}</span>
      <span
        className="order-item-category"
        data-artisanal={isArtisanal(item.categoryName) || undefined}
      >
        {item.categoryName}
      </span>
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
        <kbd aria-hidden className="kbd-hint">Enter</kbd>{' '}
        {preview.note
          ? `Observação em ${preview.line.name}: ${preview.note}`
          : `Tirar a observação de ${preview.line.name}`}
      </p>
    );
  if (preview.kind === 'adjust')
    return (
      <p className="order-item-preview" data-tone="muted">
        <kbd aria-hidden className="kbd-hint">Enter</kbd>{' '}
        {preview.delta > 0 ? 'mais um' : 'menos um'} no último item
      </p>
    );
  return null;
}

/** A lista rola (2026-10-15): o escolhido pelas setas sempre fica à vista. */
function useActiveInView(active: number | null): void {
  useEffect(() => {
    if (active === null) return;
    // O jsdom não tem `scrollIntoView`.
    document.getElementById(optionId(active))?.scrollIntoView?.({
      block: 'nearest',
    });
  }, [active]);
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
  useActiveInView(options?.active ?? null);
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
      // Clicar na barra de rolagem não tira o foco do Item (as setas continuam valendo).
      onMouseDown={(event) => event.preventDefault()}
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
          {index === options.active && <kbd aria-hidden className="kbd-hint">Enter</kbd>}
          {options.quantity > 1 && <strong>{options.quantity}×</strong>}
          <ItemLabel item={item} />
        </li>
      ))}
    </ul>
  );
}

/** Opções do "-tomate": a ligada já saiu do lanche e, escolhida, volta. */
function RemovalList({
  preview,
  items,
  quantityRef,
}: {
  preview: Extract<ItemPreview, { kind: 'removals' }>;
  items: OrderItemsState;
  quantityRef: InputRef;
}) {
  useActiveInView(preview.active);
  return (
    <ul
      className="order-item-results"
      id={LIST_ID}
      role="listbox"
      aria-label={`Retirar de ${preview.line.name}`}
      onMouseDown={(event) => event.preventDefault()}
    >
      {preview.choices.map((choice, index) => (
        <li
          key={choice.key}
          id={optionId(index)}
          role="option"
          aria-selected={index === preview.active}
          onMouseDown={(event) => {
            event.preventDefault();
            items.pickRemoval(choice);
            focusOn(quantityRef);
          }}
        >
          {index === preview.active && <kbd aria-hidden className="kbd-hint">Enter</kbd>}
          <span className="order-item-name">{choice.label}</span>
          <span className="order-item-category">
            {choiceRemoved(preview.line, choice) ? 'devolver' : 'retirar'}
          </span>
        </li>
      ))}
    </ul>
  );
}

/**
 * A pergunta do pão (2026-11-08), logo depois de lançar o artesanal: tecla 1..n, setas + Enter
 * ou clique; "Depois" (Esc) deixa a linha pendente, em vermelho.
 */
function ChoiceList({
  preview,
  items,
  quantityRef,
}: {
  preview: Extract<ItemPreview, { kind: 'choice' }>;
  items: OrderItemsState;
  quantityRef: InputRef;
}) {
  useActiveInView(preview.active);
  const choose = (index: number) => {
    items.choose(index);
    focusOn(quantityRef);
  };
  return (
    <div className="order-item-choice">
      <p className="order-item-choice-title">
        Escolha {preview.subject} do {preview.line.name}
      </p>
      <ul
        className="order-item-results"
        id={LIST_ID}
        role="listbox"
        aria-label={`Escolha ${preview.subject} do ${preview.line.name}`}
        onMouseDown={(event) => event.preventDefault()}
      >
        {preview.options.map((option, index) => (
          <li
            key={option.id}
            id={optionId(index)}
            role="option"
            aria-selected={index === preview.active}
            onMouseDown={(event) => {
              event.preventDefault();
              choose(index);
            }}
          >
            <kbd className="order-item-choice-key">{index + 1}</kbd>
            <span className="order-item-name">{option.name}</span>
          </li>
        ))}
      </ul>
      <button
        type="button"
        className="button button-secondary button-sm"
        onMouseDown={(event) => event.preventDefault()}
        onClick={items.skipChoice}
      >
        Depois <kbd aria-hidden className="kbd-hint">Esc</kbd>
      </button>
    </div>
  );
}

/**
 * Teclas enquanto a pergunta do pão está aberta, no Qtd ou no Item: 1..n escolhe, setas e
 * Enter, Esc deixa para depois; outra tecla de texto não escreve (o próximo número não vaza).
 */
function handleChoiceKey(
  event: KeyboardEvent<HTMLInputElement>,
  { items, quantityRef }: OrderItemFieldProps,
): void {
  const { preview } = items;
  if (preview.kind !== 'choice') return;
  const arrow = { ArrowDown: 1, ArrowUp: -1 }[event.key] as 1 | -1 | undefined;
  const handled = ['Enter', 'Escape', 'ArrowDown', 'ArrowUp'];
  // F4, F9 e Ctrl+… seguem para os atalhos da tela.
  if (event.ctrlKey || event.altKey) return;
  if (event.key.length !== 1 && !handled.includes(event.key)) return;
  event.preventDefault();
  if (arrow) return items.moveActive(arrow);
  if (event.key === 'Escape') return items.skipChoice();
  const index =
    event.key === 'Enter' ? preview.active : Number(event.key) - 1;
  if (Number.isInteger(index) && items.choose(index)) focusOn(quantityRef);
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
  if (items.preview.kind === 'choice') return handleChoiceKey(event, props);
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
  props: OrderItemFieldProps,
): void {
  const { items, inputRef } = props;
  if (items.preview.kind === 'choice') return handleChoiceKey(event, props);
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
 * (2*9), parte do nome (coca), adicional na última linha (+bacon), retirada dela (-tomate) ou a
 * observação dela (/sem tomate). A prévia mostra o que o Enter vai pôr antes de pôr.
 *
 * No celular (2026-11-05): `phoneMode=true` oculta o campo Qtd (a quantidade vem da grade) e
 * adapta o teclado virtual com `enterKeyHint="enter"` e placeholder curto.
 */
export function OrderItemField(props: OrderItemFieldProps) {
  const { items, quantityRef, inputRef, phoneMode } = props;
  const { preview } = items;
  const options = optionsOf(preview);
  const removals = preview.kind === 'removals' ? preview : null;
  const choice = preview.kind === 'choice' ? preview : null;
  const active = options?.active ?? removals?.active ?? choice?.active ?? null;
  const open = active !== null;
  return (
    <div className="order-item-field">
      <div className="order-item-entry">
        {!phoneMode && (
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
        )}
        <label className="field">
          Item
          <input
            ref={inputRef}
            role="combobox"
            aria-expanded={open}
            aria-controls={open ? LIST_ID : undefined}
            aria-activedescendant={
              active === null ? undefined : optionId(active)
            }
            aria-autocomplete="list"
            autoComplete="off"
            enterKeyHint={phoneMode ? 'enter' : undefined}
            placeholder={
              phoneMode
                ? 'Número ou nome'
                : '9 · 9. artesanal · 2*9 · nome · +bacon · -tomate · /obs'
            }
            value={items.text}
            onChange={(event) => items.setText(event.target.value)}
            onKeyDown={(event) => handleItemKey(event, props)}
          />
        </label>
      </div>
      <PreviewLine preview={preview} items={items} />
      <ResultList options={options} items={items} quantityRef={quantityRef} />
      {removals && (
        <RemovalList
          preview={removals}
          items={items}
          quantityRef={quantityRef}
        />
      )}
      {choice && (
        <ChoiceList preview={choice} items={items} quantityRef={quantityRef} />
      )}
    </div>
  );
}
