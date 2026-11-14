import { describe, expect, it } from 'vitest';
import { baseUnitCostOn, type UnitCostHistoryPoint } from './base-on-date.js';

describe('baseUnitCostOn', () => {
  const history: UnitCostHistoryPoint[] = [
    {
      createdAt: new Date('2026-10-10T12:00:00Z'),
      oldUnitCost: '1.2000',
      newUnitCost: '1.5000',
    },
    {
      createdAt: new Date('2026-10-01T10:00:00Z'),
      oldUnitCost: '1.0000',
      newUnitCost: '1.2000',
    },
    {
      createdAt: new Date('2026-10-20T15:00:00Z'),
      oldUnitCost: '1.5000',
      newUnitCost: '1.8000',
    },
  ];

  it('sem histórico devolve o custo unitário atual', () => {
    expect(baseUnitCostOn([], '2.5000', new Date('2026-10-15T00:00:00Z'))).toBe(
      '2.5000',
    );
    expect(
      baseUnitCostOn([], null, new Date('2026-10-15T00:00:00Z')),
    ).toBeNull();
  });

  it('nota antes do 1º registro devolve o oldUnitCost do primeiro registro', () => {
    const at = new Date('2026-09-25T08:00:00Z');
    expect(baseUnitCostOn(history, '1.8000', at)).toBe('1.0000');
  });

  it('nota entre dois registros devolve o newUnitCost do registro anterior mais recente', () => {
    const at = new Date('2026-10-05T09:00:00Z');
    expect(baseUnitCostOn(history, '1.8000', at)).toBe('1.2000');

    const at2 = new Date('2026-10-15T18:00:00Z');
    expect(baseUnitCostOn(history, '1.8000', at2)).toBe('1.5000');
  });

  it('nota na data exata de um registro devolve o newUnitCost dele', () => {
    const at = new Date('2026-10-10T12:00:00Z');
    expect(baseUnitCostOn(history, '1.8000', at)).toBe('1.5000');
  });

  it('nota após o último registro devolve o newUnitCost do último registro', () => {
    const at = new Date('2026-10-25T10:00:00Z');
    expect(baseUnitCostOn(history, '1.8000', at)).toBe('1.8000');
  });

  it('funciona com histórico fora de ordem cronológica', () => {
    const unsorted: UnitCostHistoryPoint[] = [
      {
        createdAt: new Date('2026-11-01T00:00:00Z'),
        oldUnitCost: '3.00',
        newUnitCost: '4.00',
      },
      {
        createdAt: new Date('2026-09-01T00:00:00Z'),
        oldUnitCost: '2.00',
        newUnitCost: '3.00',
      },
    ];
    expect(
      baseUnitCostOn(unsorted, '4.00', new Date('2026-08-01T00:00:00Z')),
    ).toBe('2.00');
    expect(
      baseUnitCostOn(unsorted, '4.00', new Date('2026-10-01T00:00:00Z')),
    ).toBe('3.00');
  });
});
