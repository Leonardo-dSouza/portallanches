import { describe, expect, it } from 'vitest';
import type { RecipeItem } from '../api/cost-types';
import {
  addIngredientItem,
  computeIngredientSubtotal,
  parseValidQuantity,
  removeIngredientItem,
  updateIngredientQuantity,
} from './ingredient-items';

describe('ingredient-items', () => {
  const initialItems: RecipeItem[] = [
    { supplyId: 1, quantity: '2' },
    { supplyId: 2, quantity: '0.5' },
  ];

  describe('updateIngredientQuantity', () => {
    it('troca a quantidade do insumo correspondente', () => {
      const result = updateIngredientQuantity(initialItems, 1, '3');
      expect(result).toEqual([
        { supplyId: 1, quantity: '3' },
        { supplyId: 2, quantity: '0.5' },
      ]);
    });

    it('mantém a lista inalterada se o insumo não for encontrado', () => {
      const result = updateIngredientQuantity(initialItems, 99, '3');
      expect(result).toEqual(initialItems);
    });
  });

  describe('removeIngredientItem', () => {
    it('tira o insumo selecionado da lista', () => {
      const result = removeIngredientItem(initialItems, 1);
      expect(result).toEqual([{ supplyId: 2, quantity: '0.5' }]);
    });

    it('mantém a lista inalterada se o insumo não existir', () => {
      const result = removeIngredientItem(initialItems, 99);
      expect(result).toEqual(initialItems);
    });
  });

  describe('addIngredientItem', () => {
    it('adiciona novo insumo com quantidade padrão 1', () => {
      const result = addIngredientItem(initialItems, 3);
      expect(result).toEqual([
        { supplyId: 1, quantity: '2' },
        { supplyId: 2, quantity: '0.5' },
        { supplyId: 3, quantity: '1' },
      ]);
    });

    it('não repete insumo se ele já estiver na lista', () => {
      const result = addIngredientItem(initialItems, 2);
      expect(result).toEqual(initialItems);
    });
  });

  describe('parseValidQuantity', () => {
    it('aceita quantidades válidas inteiras e com vírgula', () => {
      expect(parseValidQuantity('1')).toBe('1');
      expect(parseValidQuantity('0,036')).toBe('0.036');
      expect(parseValidQuantity('2.5')).toBe('2.5');
    });

    it('recusa vazia, zero, texto ou números negativos', () => {
      expect(parseValidQuantity('')).toBeNull();
      expect(parseValidQuantity('   ')).toBeNull();
      expect(parseValidQuantity('0')).toBeNull();
      expect(parseValidQuantity('0,00')).toBeNull();
      expect(parseValidQuantity('abc')).toBeNull();
      expect(parseValidQuantity('-1')).toBeNull();
    });
  });

  describe('computeIngredientSubtotal', () => {
    it('calcula subtotal quantidade × custo unitário sem float', () => {
      expect(computeIngredientSubtotal('0.036', '39.9000')).toBe('1.44');
      expect(computeIngredientSubtotal('1', '1.4000')).toBe('1.40');
      expect(computeIngredientSubtotal('2', '45.0000')).toBe('90.00');
    });

    it('retorna null se o custo for nulo', () => {
      expect(computeIngredientSubtotal('1', null)).toBeNull();
    });
  });
});
