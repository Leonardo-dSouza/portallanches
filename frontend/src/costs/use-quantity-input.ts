import { useState } from 'react';
import type { RecipeItem } from '../api/cost-types';
import { formatQuantity } from '../api/quantity';
import { parseValidQuantity } from './ingredient-items';

/** Quantidade digitada de um insumo: guarda o texto e só repassa quando é válida. */
export interface QuantityInput {
  typed: string;
  isInvalid: boolean;
  handleChange(rawText: string): void;
}

/**
 * Campo de quantidade de uma receita (lista de ingredientes e cupom do lanche).
 *
 * @example const { typed, isInvalid, handleChange } = useQuantityInput(item, onUpdate);
 */
export function useQuantityInput(
  item: RecipeItem,
  onUpdate: (supplyId: number, quantity: string) => void,
): QuantityInput {
  const [typed, setTyped] = useState(() => formatQuantity(item.quantity));
  const [isInvalid, setIsInvalid] = useState(false);
  const handleChange = (rawText: string) => {
    setTyped(rawText);
    const valid = parseValidQuantity(rawText);
    setIsInvalid(!valid);
    if (valid) onUpdate(item.supplyId, valid);
  };
  return { typed, isInvalid, handleChange };
}
