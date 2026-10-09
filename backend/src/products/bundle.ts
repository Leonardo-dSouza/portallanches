import { fromMilli, toMilli } from '../common/quantity.js';
import type { CostedComponent } from './cmv.js';

/** Item de um combo com a composição dele (insumos por unidade do item). */
export interface BundleItemCost<C extends CostedComponent = CostedComponent> {
  /** Quantas unidades do item vão no combo (1 a 99). */
  quantity: number;
  components: C[];
}

/**
 * Insumos de um combo: os dos itens, vezes a quantidade de cada item (pedido do usuário,
 * 2026-10-09: "1 X Salada + 1 Guaraná lata"). O combo não tem receita própria, então o CMV e
 * a baixa acompanham a receita dos itens.
 *
 * @example expandBundle([{ quantity: 2, components: [{ quantity: '1', unitCost: '3.1' }] }]) // [{ quantity: '2', unitCost: '3.1' }]
 */
export function expandBundle<C extends CostedComponent>(
  items: BundleItemCost<C>[],
): C[] {
  return items.flatMap((item) =>
    item.components.map((component) => ({
      ...component,
      quantity: fromMilli(toMilli(component.quantity) * item.quantity),
    })),
  );
}
