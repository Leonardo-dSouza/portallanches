import { useMemo, useState } from 'react';
import type { CostSupply, RecipeItem } from '../api/cost-types';
import { formatAmount } from '../api/money';
import {
  addIngredientItem,
  computeIngredientSubtotal,
  removeIngredientItem,
  updateIngredientQuantity,
} from './ingredient-items';
import { SupplySearch } from './SupplySearch';
import { useQuantityInput } from './use-quantity-input';

export interface IngredientRowsProps {
  items: RecipeItem[];
  supplies: CostSupply[];
  excludedSupplyIds?: number[];
  onChange(items: RecipeItem[]): void;
  addLabel?: string;
}

interface RowItemProps {
  item: RecipeItem;
  supply: CostSupply | undefined;
  onUpdate(supplyId: number, quantity: string): void;
  onRemove(supplyId: number): void;
}

function RowItem({ item, supply, onUpdate, onRemove }: RowItemProps) {
  const { typed, isInvalid, handleChange } = useQuantityInput(item, onUpdate);

  const name = supply?.name ?? `Insumo ${item.supplyId}`;
  const unit = supply?.countUnit ?? '';
  const unitCostText = supply?.unitCost
    ? supply.unitCost.replace('.', ',')
    : '—';
  const subtotal = computeIngredientSubtotal(
    item.quantity,
    supply?.unitCost ?? null,
  );

  return (
    <tr>
      <td>{name}</td>
      <td className="num">
        <span className="inline-flex items-center gap-1.5 justify-end">
          <input
            className={`cell ${isInvalid ? 'border-danger bg-danger-soft' : ''}`}
            aria-label={`Quantidade de ${name}`}
            aria-invalid={isInvalid}
            value={typed}
            onChange={(e) => handleChange(e.target.value)}
          />
          <span className="text-muted text-xs">{unit}</span>
        </span>
      </td>
      <td className="num">{unitCostText}</td>
      <td className="num">{subtotal ? formatAmount(subtotal) : '—'}</td>
      <td className="text-right">
        <button
          type="button"
          className="button-ghost button-danger button-sm"
          aria-label={`Tirar ${name}`}
          onClick={() => onRemove(item.supplyId)}
        >
          Tirar
        </button>
      </td>
    </tr>
  );
}

/**
 * Editor tabular de ingredientes com edição de quantidade, visualização de subtotal e adição via busca.
 *
 * @example <IngredientRows items={items} supplies={supplies} onChange={setItems} />
 */
export function IngredientRows({
  items,
  supplies,
  excludedSupplyIds,
  onChange,
  addLabel = '+ Ingrediente',
}: IngredientRowsProps) {
  const [isSearching, setIsSearching] = useState(false);

  const supplyMap = useMemo(
    () => new Map(supplies.map((s) => [s.id, s])),
    [supplies],
  );

  const availableSupplies = useMemo(() => {
    const used = new Set(items.map((i) => i.supplyId));
    const excluded = new Set(excludedSupplyIds ?? []);
    return supplies.filter((s) => !used.has(s.id) && !excluded.has(s.id));
  }, [supplies, items, excludedSupplyIds]);

  const handleUpdate = (supplyId: number, quantity: string) => {
    onChange(updateIngredientQuantity(items, supplyId, quantity));
  };

  const handleRemove = (supplyId: number) => {
    onChange(removeIngredientItem(items, supplyId));
  };

  const handleSelect = (supplyId: number) => {
    onChange(addIngredientItem(items, supplyId));
    setIsSearching(false);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="table-box">
        <table className="table">
          <thead>
            <tr>
              <th>Insumo</th>
              <th className="num">Quantidade</th>
              <th className="num">Custo por unidade</th>
              <th className="num">Subtotal</th>
              <th>
                <span className="sr-only">Ações</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <RowItem
                key={item.supplyId}
                item={item}
                supply={supplyMap.get(item.supplyId)}
                onUpdate={handleUpdate}
                onRemove={handleRemove}
              />
            ))}
          </tbody>
        </table>
      </div>

      {isSearching ? (
        <SupplySearch
          available={availableSupplies}
          onSelect={handleSelect}
          onCancel={() => setIsSearching(false)}
        />
      ) : (
        <div>
          <button
            type="button"
            className="button button-secondary button-sm"
            onClick={() => setIsSearching(true)}
          >
            {addLabel}
          </button>
        </div>
      )}
    </div>
  );
}
