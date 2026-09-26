import { COSTS, gridOf, MAPPING } from './menu-grid.fixture.js';
import { numericCell, planSupplies, toUnitCost } from './supply-costs.js';

describe('custos dos insumos', () => {
  it('numericCell aceita número e texto numérico', () => {
    expect(numericCell(3.02)).toBe(3.02);
    expect(numericCell(' 3.02 ')).toBe(3.02);
    expect(numericCell('xx')).toBeNull();
    expect(numericCell(null)).toBeNull();
  });

  it('toUnitCost divide pela quantidade comprada e guarda 4 casas', () => {
    expect(toUnitCost(37.5, '36')).toBe('1.0417');
    expect(toUnitCost(39.9, '1')).toBe('39.9');
    expect(toUnitCost(15.29, '3.02')).toBe('5.0629');
  });

  it('planeja os insumos com a chave do nome e o custo', () => {
    const { supplies, issues } = planSupplies(COSTS, MAPPING.supplies);
    expect(issues).toEqual([]);
    expect(supplies[1]).toEqual({
      name: 'Hambúrguer 56g',
      nameKey: 'hamburguer 56g',
      countUnit: 'un',
      unitCost: '1',
      deductOnSale: true,
      packages: [{ name: 'caixa', quantity: '36' }],
    });
  });

  it('preço que não é número e insumo repetido viram erro', () => {
    const [cheese] = MAPPING.supplies;
    const again = { ...cheese, costCell: 'E7' };
    const { issues } = planSupplies(gridOf({ E6: 'caro', E7: 5 }), [
      cheese,
      again,
      again,
    ]);
    expect(issues.map((i) => i.where)).toEqual([
      'itens_custos!E6',
      'mapeamento',
    ]);
    expect(issues[0].message).toMatch(/recebido "caro", esperado número/);
  });
});
