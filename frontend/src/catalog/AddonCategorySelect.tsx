import type { ProductApi } from '../api/product-api';
import type { ProductCategory } from '../api/types';
import { addonTargets } from './category-list';
import { useRowAction, type RowContext } from './use-row-action';

interface AddonCategorySelectProps {
  category: ProductCategory;
  all: ProductCategory[];
  products: ProductApi;
  context: RowContext;
}

const NONE = '';

/**
 * De qual categoria vêm os adicionais dos itens desta (pedido do usuário, 2026-10-09: o
 * caixa só oferece bacon no lanche e granola no açaí).
 */
export function AddonCategorySelect(props: AddonCategorySelectProps) {
  const { category, all, products, context } = props;
  const { busy, run } = useRowAction(context);
  const targets = addonTargets(all, category);
  const save = (value: string) => {
    const addonCategoryId = value === NONE ? null : Number(value);
    void run(() => products.setAddonCategory(category.id, addonCategoryId));
  };
  return (
    <select
      className="cell-input"
      aria-label={`Adicionais de ${category.name}`}
      value={
        category.addonCategoryId === null
          ? NONE
          : String(category.addonCategoryId)
      }
      disabled={busy || targets.length === 0}
      onChange={(event) => save(event.target.value)}
    >
      <option value={NONE}>Sem adicionais</option>
      {targets.map((target) => (
        <option key={target.id} value={String(target.id)}>
          {target.name}
        </option>
      ))}
    </select>
  );
}
