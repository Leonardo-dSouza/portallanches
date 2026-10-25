import { seesCosts, withUnitCostFor } from './cost-visibility.js';
import type { SessionUser } from './session-user.js';

const ADMIN: SessionUser = { id: 1, name: 'admin', role: 'ADMIN' };
const CAIXA: SessionUser = { id: 2, name: 'caixa', role: 'CAIXA' };

describe('seesCosts', () => {
  it('só o admin vê custo', () => {
    expect(seesCosts(ADMIN)).toBe(true);
    expect(seesCosts(CAIXA)).toBe(false);
  });
});

describe('withUnitCostFor', () => {
  const row = { id: 3, name: 'Bacon', unitCost: '19.90' };

  it('o admin recebe a linha inteira', () => {
    expect(withUnitCostFor(ADMIN, row)).toEqual(row);
  });

  it('o caixa recebe a linha sem o campo (nem nulo)', () => {
    expect(withUnitCostFor(CAIXA, row)).toEqual({ id: 3, name: 'Bacon' });
    expect('unitCost' in withUnitCostFor(CAIXA, row)).toBe(false);
  });
});
