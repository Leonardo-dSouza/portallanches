import type { ProductApi } from '../api/product-api';
import type { ProductCategory } from '../api/types';
import { CategoryLinkSelect } from './CategoryLinkSelect';
import { choiceTargets } from './category-list';
import { useRowAction, type RowContext } from './use-row-action';

interface ChoiceCategorySelectProps {
  category: ProductCategory;
  all: ProductCategory[];
  products: ProductApi;
  context: RowContext;
}

/**
 * A escolha obrigatória dos itens desta categoria (pedido do usuário, 2026-11-08: todo
 * artesanal sai com o pão escolhido): o caixa pergunta ao lançar e não salva sem ela.
 */
export function ChoiceCategorySelect(props: ChoiceCategorySelectProps) {
  const { category, all, products, context } = props;
  const { busy, run } = useRowAction(context);
  return (
    <CategoryLinkSelect
      label={`Escolha obrigatória de ${category.name}`}
      noneLabel="Sem escolha"
      value={category.choiceCategoryId}
      targets={choiceTargets(all, category)}
      busy={busy}
      onChange={(choiceCategoryId) =>
        void run(() =>
          products.setChoiceCategory(category.id, choiceCategoryId),
        )
      }
    />
  );
}
