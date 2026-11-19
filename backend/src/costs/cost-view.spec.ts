import { describe, expect, it } from 'vitest';
import { costSnapshotFixture } from './cost-fakes.fixture.js';
import { applyCostChanges } from './cost-plan.js';
import type { CostChanges } from './cost-types.js';
import {
  costImpact,
  isSupplyCostComplete,
  productCostViews,
} from './cost-view.js';

const emptyChanges: CostChanges = {
  basePrices: [],
  recipes: [],
  removedRecipeSupplyIds: [],
  components: [],
  salePrices: [],
};

describe('cost-view', () => {
  describe('productCostViews', () => {
    it('X Salada já começa com cmvComplete: false devido à alface sem custo', () => {
      const snapshot = costSnapshotFixture();
      const views = productCostViews(snapshot);
      const burgerView = views.find((v) => v.id === 1);

      expect(burgerView?.cmvComplete).toBe(false);
      // Hambúrguer (6.1936) + Pão (1.25) = 7.4436 -> '7.44'
      expect(burgerView?.cmv).toBe('7.44');
    });

    it('ao dar custo à alface, X Salada passa a ter cmvComplete: true', () => {
      const snapshot = costSnapshotFixture();
      const changes: CostChanges = {
        ...emptyChanges,
        basePrices: [
          {
            supplyId: 6,
            basePrice: '10.00',
            baseQuantity: '1',
            baseLabel: null,
          },
        ],
      };
      const updated = applyCostChanges(snapshot, changes);
      const views = productCostViews(updated);
      const burgerView = views.find((v) => v.id === 1);

      expect(burgerView?.cmvComplete).toBe(true);
      // 7.4436 + 0.02 * 10 = 7.4436 + 0.20 = 7.6436 -> '7.64'
      expect(burgerView?.cmv).toBe('7.64');
    });

    it('basePrice nulo no pão deixa unitCost nulo e cmvComplete falso', () => {
      const snapshot = costSnapshotFixture();
      const changes: CostChanges = {
        ...emptyChanges,
        basePrices: [
          {
            supplyId: 5,
            basePrice: null,
            baseQuantity: '20',
            baseLabel: null,
          },
        ],
      };
      const updated = applyCostChanges(snapshot, changes);
      const views = productCostViews(updated);
      const burgerView = views.find((v) => v.id === 1);

      expect(burgerView?.cmvComplete).toBe(false);
      expect(isSupplyCostComplete(5, updated)).toBe(false);
    });

    it('creme de cebola com basePrice nulo deixa o hambúrguer incompleto e o X Salada com cmvComplete falso', () => {
      const snapshot = costSnapshotFixture();
      const changes: CostChanges = {
        ...emptyChanges,
        basePrices: [
          {
            supplyId: 4,
            basePrice: null,
            baseQuantity: '1',
            baseLabel: null,
          },
        ],
      };
      const updated = applyCostChanges(snapshot, changes);
      expect(isSupplyCostComplete(10, updated)).toBe(false);

      const views = productCostViews(updated);
      const burgerView = views.find((v) => v.id === 1);
      expect(burgerView?.cmvComplete).toBe(false);
    });

    it('calcula views do Refrigerante com categoria sem percentuais', () => {
      const snapshot = costSnapshotFixture();
      const views = productCostViews(snapshot);
      const refri = views.find((v) => v.id === 2);

      expect(refri?.pv).toBeNull();
      expect(refri?.ifoodPv).toBeNull();
      expect(refri?.profit).toBe('6.00');
      expect(refri?.belowTarget).toBe(false);
      expect(refri?.cmv).toBe('0.00');
      expect(refri?.cmvComplete).toBe(true);
    });

    it('produto sem preço de venda possui profit e marginPercent nulos e belowTarget falso', () => {
      const snapshot = costSnapshotFixture();
      const views = productCostViews(snapshot);
      const combo = views.find((v) => v.id === 3);

      expect(combo?.salePrice).toBeNull();
      expect(combo?.profit).toBeNull();
      expect(combo?.marginPercent).toBeNull();
      expect(combo?.belowTarget).toBe(false);
    });
  });

  describe('meta efetiva e estado', () => {
    it('meta própria do lanche manda no PV e no estado; PV iFood não muda', () => {
      const snapshot = costSnapshotFixture();
      const before = productCostViews(snapshot).find((v) => v.id === 1);
      snapshot.products[0] = { ...snapshot.products[0], profitPercent: '10' };
      const own = productCostViews(snapshot).find((v) => v.id === 1);

      expect(before?.profitTarget).toBe('12');
      expect(before?.ownProfitTarget).toBe(false);
      expect(own?.profitTarget).toBe('10');
      expect(own?.ownProfitTarget).toBe(true);
      // 7,44 ÷ (1 − 0,4107 − 0,10) = 15,22 → 15,30
      expect(own?.pv).toBe('15.30');
      expect(own?.ifoodPv).toBe(before?.ifoodPv);
      expect(own?.targetStatus).toBe('ok');
    });

    it('sem preço não tem estado; categoria sem % não tem meta', () => {
      const views = productCostViews(costSnapshotFixture());
      const combo = views.find((v) => v.id === 3);
      const refri = views.find((v) => v.id === 2);

      expect(combo?.targetStatus).toBeNull();
      expect(combo?.profitTarget).toBe('12');
      expect(refri?.profitTarget).toBeNull();
      expect(refri?.targetStatus).toBeNull();
    });

    it('belowTarget só conta o que cai mais de 2 pontos', () => {
      const snapshot = costSnapshotFixture();
      // 15,50 × (1 − 0,4107) − 7,44 = 1,69: 10,9% contra meta de 12% → perto
      snapshot.products[0] = { ...snapshot.products[0], salePrice: '15.50' };
      const near = productCostViews(snapshot).find((v) => v.id === 1);
      expect(near?.targetStatus).toBe('near');
      expect(near?.belowTarget).toBe(false);
    });
  });

  describe('costImpact', () => {
    it('com acém de 36.90 para 45.00: impacta acém e hambúrguer em supplies; X Salada e Combo em products; Refrigerante não', () => {
      const before = costSnapshotFixture();
      const changes: CostChanges = {
        ...emptyChanges,
        basePrices: [
          {
            supplyId: 1,
            basePrice: '45.00',
            baseQuantity: '1',
            baseLabel: null,
          },
        ],
      };
      const after = applyCostChanges(before, changes);
      const impact = costImpact(before, after);

      expect(impact.supplies.map((s) => s.supplyId)).toEqual([1, 10]);
      expect(impact.supplies.find((s) => s.supplyId === 1)).toEqual({
        supplyId: 1,
        name: 'Acém',
        before: '36.90',
        after: '45',
      });
      expect(impact.supplies.find((s) => s.supplyId === 10)).toEqual({
        supplyId: 10,
        name: 'Hambúrguer artesanal de carne',
        before: '6.1936',
        after: '6.7721',
      });

      const productIds = impact.products.map((p) => p.after.id);
      expect(productIds).toContain(1); // X Salada
      expect(productIds).toContain(3); // Combo
      expect(productIds).not.toContain(2); // Refrigerante
    });

    it('salePrices do X Salada: pv não muda; profit e marginPercent mudam; becameBelowTarget conta transição', () => {
      const before = costSnapshotFixture();

      // Caso 1: X Salada para 20.00
      // Conta à mão:
      // Preço 28.00: CMV 7.44, Custo fixo 41.07%, Lucro alvo 12%
      // Divisor = 1 - 0.4107 - 0.12 = 0.4693
      // PV = 7.44 ÷ 0.4693 = 15.853... -> arredondado para cima em 0.10 dá '15.90'
      // Lucro a 28.00: 28.00 * (1 - 0.4107) - 7.44 = 16.5004 - 7.44 = 9.0604 -> '9.06'
      // Margem a 28.00: 9.06 / 28.00 = 32.4% -> belowTarget é false
      //
      // Preço 20.00: PV continua '15.90' (pois depende só do CMV e percentuais)
      // Lucro a 20.00: 20.00 * (1 - 0.4107) - 7.44 = 11.786 - 7.44 = 4.346 -> '4.34'
      // Margem a 20.00: 4.34 / 20.00 = 21.7%
      // Como 21.7% >= 12%, belowTarget permanece false e becameBelowTarget = 0.
      const changes20: CostChanges = {
        ...emptyChanges,
        salePrices: [{ productId: 1, salePrice: '20.00' }],
      };
      const after20 = applyCostChanges(before, changes20);
      const impact20 = costImpact(before, after20);

      const xSalada20 = impact20.products.find((p) => p.after.id === 1);
      expect(xSalada20?.before.pv).toBe('15.90');
      expect(xSalada20?.after.pv).toBe('15.90');
      expect(xSalada20?.before.profit).toBe('9.06');
      expect(xSalada20?.after.profit).toBe('4.34');
      expect(xSalada20?.before.marginPercent).toBe('32.4');
      expect(xSalada20?.after.marginPercent).toBe('21.7');
      expect(xSalada20?.after.belowTarget).toBe(false);
      expect(impact20.becameBelowTarget).toBe(0);

      // Caso 2: X Salada para 15.00 (abaixo do PV de 15.90)
      // Lucro a 15.00: 15.00 * (1 - 0.4107) - 7.44 = 8.8395 - 7.44 = 1.3995 -> '1.39'
      // Margem a 15.00: 1.39 / 15.00 = 9.3%
      // 9.3% < 12% -> belowTarget torna-se true! becameBelowTarget = 1.
      const changes15: CostChanges = {
        ...emptyChanges,
        salePrices: [{ productId: 1, salePrice: '15.00' }],
      };
      const after15 = applyCostChanges(before, changes15);
      const impact15 = costImpact(before, after15);
      const xSalada15 = impact15.products.find((p) => p.after.id === 1);

      expect(xSalada15?.before.belowTarget).toBe(false);
      expect(xSalada15?.after.belowTarget).toBe(true);
      expect(impact15.becameBelowTarget).toBe(1);
    });
  });
});
