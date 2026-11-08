import type { ProductApi } from '../api/product-api';
import type { ProductCategory } from '../api/types';
import { CategoryLinkSelect } from './CategoryLinkSelect';
import { addonTargets } from './category-list';
import { useRowAction, type RowContext } from './use-row-action';

interface AddonCategorySelectProps {
  category: ProductCategory;
  all: ProductCategory[];
  products: ProductApi;
  context: RowContext;
}

/**
 * De qual categoria vêm os adicionais dos itens desta (pedido do usuário, 2026-10-09: o
 * caixa só oferece bacon no lanche e granola no açaí).
 */
export function AddonCategorySelect(props: AddonCategorySelectProps) {
  const { category, all, products, context } = props;
  const { busy, run } = useRowAction(context);
  return (
    <CategoryLinkSelect
      label={`Adicionais de ${category.name}`}
      noneLabel="Sem adicionais"
      value={category.addonCategoryId}
      targets={addonTargets(all, category)}
      busy={busy}
      onChange={(addonCategoryId) =>
        void run(() => products.setAddonCategory(category.id, addonCategoryId))
      }
    />
  );
}
