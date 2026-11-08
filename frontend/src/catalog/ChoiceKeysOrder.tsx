import { useEffect, useState } from 'react';
import type { ProductApi } from '../api/product-api';
import type { CategoryProductOrder, ProductCategory } from '../api/types';
import { MoveButtons } from './MoveButtons';
import { choiceKeyRows, moveOption } from './choice-keys';
import { useRowAction, type RowContext } from './use-row-action';

interface ChoiceKeysOrderProps {
  category: ProductCategory;
  products: ProductApi;
  context: RowContext;
}

/** As opções da categoria vindas da API; null enquanto carrega. */
function useChoiceOptions(products: ProductApi, categoryId: number) {
  const [options, setOptions] = useState<CategoryProductOrder[] | null>(null);
  useEffect(() => {
    let alive = true;
    products
      .listProductOrder(categoryId)
      .then((loaded) => alive && setOptions(loaded))
      .catch(() => alive && setOptions([]));
    return () => {
      alive = false;
    };
  }, [products, categoryId]);
  return { options, setOptions };
}

/**
 * As teclas da escolha obrigatória (pedido do usuário, 2026-11-08: "parametrizável"), na
 * linha da categoria que é a lista (o Pão): a ordem aqui é a 1, 2, 3 do caixa.
 */
export function ChoiceKeysOrder({
  category,
  products,
  context,
}: ChoiceKeysOrderProps) {
  const { busy, run } = useRowAction(context);
  const { options, setOptions } = useChoiceOptions(products, category.id);
  if (!options) return <span className="hint">Carregando…</span>;
  const move = (id: number, direction: -1 | 1) => {
    const ids = moveOption(options, id, direction);
    if (!ids) return null;
    return () =>
      void run(async () =>
        setOptions(await products.reorderProducts(category.id, ids)),
      );
  };
  return (
    <ol className="choice-keys-order" aria-label={`Teclas de ${category.name}`}>
      {choiceKeyRows(options).map((option) => (
        <li key={option.id}>
          <kbd className="order-item-choice-key">{option.key ?? '–'}</kbd>
          <span data-inactive={option.active ? undefined : true}>
            {option.name}
          </span>
          <MoveButtons
            name={option.name}
            busy={busy}
            onUp={move(option.id, -1)}
            onDown={move(option.id, 1)}
          />
        </li>
      ))}
    </ol>
  );
}
