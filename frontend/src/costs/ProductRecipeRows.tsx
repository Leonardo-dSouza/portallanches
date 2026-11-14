import type { CostSupply, RecipeItem } from '../api/cost-types';
import { IngredientRows } from './IngredientRows';

export interface ProductRecipeRowsProps {
  productId: number;
  components: RecipeItem[];
  supplies: CostSupply[];
  onChange(items: RecipeItem[]): void;
}

/**
 * Editor expandido da composição de insumos de um produto do cardápio.
 *
 * @example <ProductRecipeRows productId={10} components={components} supplies={supplies} onChange={setComponents} />
 */
export function ProductRecipeRows({
  components,
  supplies,
  onChange,
}: ProductRecipeRowsProps) {
  return (
    <div className="p-3 bg-surface rounded-control border border-line">
      <IngredientRows
        items={components}
        supplies={supplies}
        excludedSupplyIds={[]}
        onChange={onChange}
        addLabel="+ Insumo"
      />
      <p className="text-muted text-xs mt-2">
        Mudar a quantidade entra no mesmo rascunho dos preços: só vale depois de
        salvar.
      </p>
    </div>
  );
}
