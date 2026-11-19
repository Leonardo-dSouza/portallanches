import { describe, expect, it } from 'vitest';
import type { CostSupply } from '../api/cost-types';
import {
  currentChoice,
  formatChoiceLabel,
  formatUnitCost,
  formatUnitPrice,
  formatUsedIn,
  packageChoices,
  toBasePriceChange,
  unitCostFormula,
} from './base-price-values';

const MOCK_SUPPLY: CostSupply = {
  id: 1,
  name: 'Hambúrguer 56g',
  sectionId: 1,
  countUnit: 'un',
  unitCost: '1.1917',
  basePrice: '42.90',
  baseQuantity: '36',
  baseLabel: 'caixa',
  packages: [{ name: 'caixa', quantity: '36' }],
};

const PRODUCED_SUPPLY: CostSupply = {
  id: 2,
  name: 'Hambúrguer artesanal carne',
  sectionId: null,
  countUnit: 'un',
  unitCost: '5.9900',
  basePrice: null,
  baseQuantity: null,
  baseLabel: null,
  packages: [],
};

describe('base-price-values', () => {
  describe('toBasePriceChange', () => {
    it('converte valor com vírgula e embalagem para BasePriceChange', () => {
      const result = toBasePriceChange(1, '44,80', {
        label: 'caixa',
        quantity: '36',
      });
      expect(result).toEqual({
        ok: true,
        change: {
          supplyId: 1,
          basePrice: '44.80',
          baseQuantity: '36',
          baseLabel: 'caixa',
        },
      });
    });

    it('aceita ponto como separador decimal', () => {
      const result = toBasePriceChange(1, '44.80', {
        label: 'caixa',
        quantity: '36',
      });
      expect(result).toEqual({
        ok: true,
        change: {
          supplyId: 1,
          basePrice: '44.80',
          baseQuantity: '36',
          baseLabel: 'caixa',
        },
      });
    });

    it('converte texto vazio para basePrice null', () => {
      const result = toBasePriceChange(1, '', {
        label: 'caixa',
        quantity: '36',
      });
      expect(result).toEqual({
        ok: true,
        change: {
          supplyId: 1,
          basePrice: null,
          baseQuantity: '36',
          baseLabel: 'caixa',
        },
      });
    });

    it('rejeita valor inválido com a mensagem contendo o texto recebido', () => {
      const result = toBasePriceChange(1, 'abc', {
        label: 'caixa',
        quantity: '36',
      });
      expect(result).toEqual({
        ok: false,
        problem: expect.stringContaining('abc'),
      });
    });

    it('gera baseQuantity 1 e baseLabel null quando a escolha é unidade', () => {
      const result = toBasePriceChange(1, '10,00', {
        label: null,
        quantity: '1',
      });
      expect(result).toEqual({
        ok: true,
        change: {
          supplyId: 1,
          basePrice: '10.00',
          baseQuantity: '1',
          baseLabel: null,
        },
      });
    });
  });

  describe('packageChoices', () => {
    it('inclui embalagens de compra e a opção de unidade', () => {
      const choices = packageChoices(MOCK_SUPPLY);
      expect(choices).toEqual([
        { label: 'caixa', quantity: '36' },
        { label: null, quantity: '1' },
      ]);
    });

    it('devolve apenas unidade quando o insumo não possui embalagens', () => {
      const choices = packageChoices(PRODUCED_SUPPLY);
      expect(choices).toEqual([{ label: null, quantity: '1' }]);
    });
  });

  describe('currentChoice', () => {
    it('extrai a embalagem gravada no insumo', () => {
      expect(currentChoice(MOCK_SUPPLY)).toEqual({
        label: 'caixa',
        quantity: '36',
      });
    });

    it('devolve unidade quando o insumo não tem base gravada', () => {
      expect(currentChoice(PRODUCED_SUPPLY)).toEqual({
        label: null,
        quantity: '1',
      });
    });
  });

  describe('formatChoiceLabel', () => {
    it('formata embalagem com nome, quantidade e unidade de contagem', () => {
      expect(formatChoiceLabel({ label: 'caixa', quantity: '36' }, 'un')).toBe(
        'caixa de 36 un',
      );
    });

    it('formata opção de unidade quando label é null', () => {
      expect(formatChoiceLabel({ label: null, quantity: '1' }, 'kg')).toBe(
        'unidade (kg)',
      );
    });

    it('resume rótulo quando coincide com a unidade de contagem', () => {
      expect(formatChoiceLabel({ label: 'kg', quantity: '1' }, 'kg')).toBe(
        'kg',
      );
    });

    it('preserva rótulos que já descrevem o pacote', () => {
      expect(
        formatChoiceLabel({ label: 'caixa de 36 un', quantity: '36' }, 'un'),
      ).toBe('caixa de 36 un');
    });
  });

  describe('formatUnitCost', () => {
    it('formata custo com 4 casas decimais e unidade', () => {
      expect(formatUnitCost('1.2444', 'un')).toBe('1,2444 /un');
      expect(formatUnitCost('39.9000', 'kg')).toBe('39,9000 /kg');
    });

    it('retorna sem custo quando o valor é nulo', () => {
      expect(formatUnitCost(null, 'un')).toBe('sem custo');
    });
  });

  describe('formatUsedIn', () => {
    it('formata quantidade de lanches e fichas', () => {
      expect(formatUsedIn(22, 0)).toBe('22 lanches');
      expect(formatUsedIn(1, 0)).toBe('1 lanche');
      expect(formatUsedIn(0, 1)).toBe('1 ficha');
      expect(formatUsedIn(0, 3)).toBe('3 fichas');
      expect(formatUsedIn(12, 1)).toBe('12 lanches · 1 ficha');
      expect(formatUsedIn(0, 0)).toBe('—');
    });
  });

  describe('formatUnitPrice', () => {
    it('2 casas a partir de R$ 0,10; abaixo, 4 casas para não virar zero', () => {
      expect(formatUnitPrice('1.2444')).toBe('R$ 1,24');
      expect(formatUnitPrice('39.9000')).toBe('R$ 39,90');
      expect(formatUnitPrice('0.1000')).toBe('R$ 0,10');
      expect(formatUnitPrice('0.0735')).toBe('R$ 0,0735');
      expect(formatUnitPrice('1.2450')).toBe('R$ 1,25');
    });
  });

  describe('unitCostFormula', () => {
    it('mostra a divisão da compra quando a embalagem tem mais de 1', () => {
      expect(unitCostFormula('44.80', '36')).toBe('44,80 ÷ 36');
      expect(unitCostFormula('16.50', '3.02')).toBe('16,50 ÷ 3,02');
    });

    it('sem divisão quando compra por unidade ou sem preço', () => {
      expect(unitCostFormula('39.90', '1')).toBeNull();
      expect(unitCostFormula(null, '36')).toBeNull();
    });
  });
});
