import { X } from 'lucide-react';
import { useId, useMemo, useState } from 'react';
import type { CostSupply, RecipeItem } from '../api/cost-types';
import { formatMoney, moneyToCents } from '../api/money';
import {
  addIngredientItem,
  computeIngredientSubtotal,
  removeIngredientItem,
  updateIngredientQuantity,
} from './ingredient-items';
import { SupplySearch } from './SupplySearch';
import { useQuantityInput } from './use-quantity-input';

export interface RecipeReceiptProps {
  productName: string;
  items: RecipeItem[];
  supplies: CostSupply[];
  /** Custo dos insumos que a API calculou (a soma de baixo). */
  cmv: string;
  onChange(items: RecipeItem[]): void;
}

interface ReceiptLineProps {
  item: RecipeItem;
  supply: CostSupply | undefined;
  /** Fração do custo da receita (0 a 1) para a barrinha. */
  weight: number;
  onUpdate(supplyId: number, quantity: string): void;
  onRemove(supplyId: number): void;
}

function ReceiptLine(props: ReceiptLineProps) {
  const { item, supply, weight, onUpdate, onRemove } = props;
  const quantity = useQuantityInput(item, onUpdate);
  const name = supply?.name ?? `Insumo ${item.supplyId}`;
  const subtotal = computeIngredientSubtotal(
    item.quantity,
    supply?.unitCost ?? null,
  );
  return (
    <li className="receipt-line">
      <span className="receipt-name">{name}</span>
      <input
        className={`cell-input receipt-qty ${quantity.isInvalid ? 'is-invalid' : ''}`}
        aria-label={`Quantidade de ${name}`}
        aria-invalid={quantity.isInvalid}
        inputMode="decimal"
        value={quantity.typed}
        onChange={(e) => quantity.handleChange(e.target.value)}
      />
      <span className="receipt-unit">{supply?.countUnit ?? ''}</span>
      <span className="receipt-weight" aria-hidden="true">
        <span style={{ width: `${weight * 100}%` }} />
      </span>
      <span className="receipt-cost">
        {subtotal ? formatMoney(subtotal) : 'sem custo'}
      </span>
      <button
        type="button"
        className="button-ghost button-sm receipt-remove"
        aria-label={`Tirar ${name}`}
        onClick={() => onRemove(item.supplyId)}
      >
        <X aria-hidden />
      </button>
    </li>
  );
}

const subtotalCents = (item: RecipeItem, supply: CostSupply | undefined) => {
  const subtotal = computeIngredientSubtotal(
    item.quantity,
    supply?.unitCost ?? null,
  );
  return subtotal ? moneyToCents(subtotal) : 0;
};

/**
 * Ordem do que mais pesa primeiro, fixada ao abrir: mudar a quantidade não faz a linha pular
 * enquanto se digita. Insumo novo entra no fim.
 */
function useWeightOrder(
  items: RecipeItem[],
  supplyMap: Map<number, CostSupply>,
) {
  const [order] = useState(() =>
    [...items]
      .sort(
        (a, b) =>
          subtotalCents(b, supplyMap.get(b.supplyId)) -
          subtotalCents(a, supplyMap.get(a.supplyId)),
      )
      .map((item) => item.supplyId),
  );
  const rank = (id: number) => {
    const index = order.indexOf(id);
    return index === -1 ? order.length : index;
  };
  return [...items].sort((a, b) => rank(a.supplyId) - rank(b.supplyId));
}

function ReceiptAdd(props: {
  items: RecipeItem[];
  supplies: CostSupply[];
  onAdd(supplyId: number): void;
}) {
  const [searching, setSearching] = useState(false);
  const used = new Set(props.items.map((i) => i.supplyId));
  if (!searching)
    return (
      <button
        type="button"
        className="button-ghost button-sm"
        onClick={() => setSearching(true)}
      >
        + Insumo
      </button>
    );
  return (
    <SupplySearch
      available={props.supplies.filter((s) => !used.has(s.id))}
      onSelect={(id) => {
        props.onAdd(id);
        setSearching(false);
      }}
      onCancel={() => setSearching(false)}
    />
  );
}

/**
 * Receita do lanche como um cupom: insumo, quantidade (editável), quanto pesa no custo e o custo de
 * cada um; embaixo, o custo dos insumos. Mudar aqui entra no rascunho (só vale ao salvar).
 *
 * @example <RecipeReceipt productName="X Burguer" items={items} supplies={supplies} cmv="8.48" onChange={set} />
 */
export function RecipeReceipt(props: RecipeReceiptProps) {
  const { productName, items, supplies, cmv, onChange } = props;
  const supplyMap = useMemo(
    () => new Map(supplies.map((s) => [s.id, s])),
    [supplies],
  );
  const ordered = useWeightOrder(items, supplyMap);
  const total = items.reduce(
    (sum, i) => sum + subtotalCents(i, supplyMap.get(i.supplyId)),
    0,
  );
  const titleId = useId();
  return (
    <section className="receipt" aria-labelledby={titleId}>
      <header className="receipt-head">
        <h3 id={titleId}>Receita do {productName}</h3>
        <span>o que mais pesa primeiro</span>
      </header>
      <p className="hint">Mude a quantidade e a conta muda junto.</p>
      <ul className="receipt-lines">
        {ordered.map((item) => (
          <ReceiptLine
            key={item.supplyId}
            item={item}
            supply={supplyMap.get(item.supplyId)}
            weight={
              total > 0
                ? subtotalCents(item, supplyMap.get(item.supplyId)) / total
                : 0
            }
            onUpdate={(id, q) =>
              onChange(updateIngredientQuantity(items, id, q))
            }
            onRemove={(id) => onChange(removeIngredientItem(items, id))}
          />
        ))}
      </ul>
      <footer className="receipt-total">
        <span>Custo dos insumos</span>
        <strong>{formatMoney(cmv)}</strong>
      </footer>
      <ReceiptAdd
        items={items}
        supplies={supplies}
        onAdd={(id) => onChange(addIngredientItem(items, id))}
      />
    </section>
  );
}
