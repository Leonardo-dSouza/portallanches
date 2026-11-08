import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import {
  buildMovementHistory,
  buildSupplyMovementsReport,
  calculatePeriodTotals,
  filterMovements,
  groupMovementsByOperation,
  kindToPortuguese,
  originLabelOf,
  parseMovementsQuery,
  type GroupedStockMovement,
  type RawStockMovementRecord,
} from './supply-movements.js';

const TIME_ZONE = 'America/Sao_Paulo';

const rawRow = (
  overrides: Partial<RawStockMovementRecord> = {},
): RawStockMovementRecord => ({
  id: 1,
  supplyId: 10,
  lotId: 101,
  kind: 'ENTRY',
  quantity: '10',
  orderId: null,
  staffConsumptionId: null,
  createdById: 1,
  createdByName: 'Admin',
  createdAt: new Date('2026-11-01T12:00:00.000Z'),
  order: null,
  staffConsumption: null,
  ...overrides,
});

describe('groupMovementsByOperation', () => {
  it('junta movimentações de lotes diferentes da mesma operação somando as quantidades', () => {
    const time = new Date('2026-11-05T20:00:00.000Z');
    const rows: RawStockMovementRecord[] = [
      rawRow({
        id: 1,
        lotId: 101,
        kind: 'SALE',
        quantity: '-2',
        orderId: 12,
        createdAt: time,
      }),
      rawRow({
        id: 2,
        lotId: 102,
        kind: 'SALE',
        quantity: '-1',
        orderId: 12,
        createdAt: time,
      }),
    ];
    const grouped = groupMovementsByOperation(rows);
    expect(grouped).toHaveLength(1);
    expect(grouped[0].quantityMilli).toBe(-3000);
    expect(grouped[0].id).toBe(1);
  });

  it('mantém separadas operações com instantes, tipos ou donos diferentes', () => {
    const rows: RawStockMovementRecord[] = [
      rawRow({
        id: 1,
        kind: 'ENTRY',
        quantity: '10',
        createdAt: new Date('2026-11-01T12:00:00.000Z'),
      }),
      rawRow({
        id: 2,
        kind: 'ENTRY',
        quantity: '5',
        createdAt: new Date('2026-11-02T12:00:00.000Z'),
      }),
      rawRow({
        id: 3,
        kind: 'COUNT',
        quantity: '-2',
        createdAt: new Date('2026-11-02T12:00:00.000Z'),
      }),
    ];
    const grouped = groupMovementsByOperation(rows);
    expect(grouped).toHaveLength(3);
  });
});

describe('buildMovementHistory e saldo acumulado', () => {
  it('acumula o saldo na ordem cronológica batendo com o saldo final', () => {
    const rows: RawStockMovementRecord[] = [
      rawRow({
        id: 1,
        kind: 'ENTRY',
        quantity: '10',
        createdAt: new Date('2026-11-01T10:00:00Z'),
      }),
      rawRow({
        id: 2,
        kind: 'COUNT',
        quantity: '-2',
        createdAt: new Date('2026-11-02T10:00:00Z'),
      }),
      rawRow({
        id: 3,
        kind: 'SALE',
        quantity: '-3',
        createdAt: new Date('2026-11-03T10:00:00Z'),
      }),
      rawRow({
        id: 4,
        kind: 'SALE_RETURN',
        quantity: '1',
        createdAt: new Date('2026-11-04T10:00:00Z'),
      }),
    ];
    const grouped = groupMovementsByOperation(rows);
    const history = buildMovementHistory(grouped);

    expect(history.map((h) => h.balanceAfter)).toEqual(['10', '8', '5', '6']);
  });
});

describe('originLabelOf e rótulos', () => {
  it('rotula pedido com número do dia e data da noite', () => {
    const op: GroupedStockMovement = {
      ...rawRow(),
      kind: 'SALE',
      quantityMilli: -1000,
      orderId: 44,
      order: { dayNumber: 12, businessDate: '2026-11-05' },
    };
    expect(originLabelOf(op, 5000, 4000)).toBe('Pedido #12 de 05/11');
  });

  it('rotula pedido apagado apenas com o id', () => {
    const op: GroupedStockMovement = {
      ...rawRow(),
      kind: 'SALE',
      quantityMilli: -1000,
      orderId: 44,
      order: null,
    };
    expect(originLabelOf(op, 5000, 4000)).toBe('Pedido #44');
  });

  it('rotula consumo interno com o nome de quem consumiu', () => {
    const op: GroupedStockMovement = {
      ...rawRow(),
      kind: 'SALE',
      quantityMilli: -1000,
      staffConsumptionId: 7,
      staffConsumption: { consumerName: 'Bianca' },
    };
    expect(originLabelOf(op, 5000, 4000)).toBe('Consumo — Bianca');
  });

  it('rotula contagem com saldo antes e depois', () => {
    const op: GroupedStockMovement = {
      ...rawRow(),
      kind: 'COUNT',
      quantityMilli: -2000,
    };
    expect(originLabelOf(op, 8000, 6000)).toBe('Contagem 8 → 6');
  });

  it('devolve null para entrada e estorno', () => {
    const entry: GroupedStockMovement = {
      ...rawRow(),
      kind: 'ENTRY',
      quantityMilli: 10000,
    };
    const reversal: GroupedStockMovement = {
      ...rawRow(),
      kind: 'REVERSAL',
      quantityMilli: -10000,
    };
    expect(originLabelOf(entry, 0, 10000)).toBeNull();
    expect(originLabelOf(reversal, 10000, 0)).toBeNull();
  });

  it('traduz os tipos para português', () => {
    expect(kindToPortuguese('ENTRY')).toBe('Entrada');
    expect(kindToPortuguese('COUNT')).toBe('Contagem');
    expect(kindToPortuguese('REVERSAL')).toBe('Estorno');
    expect(kindToPortuguese('SALE')).toBe('Venda');
    expect(kindToPortuguese('SALE_RETURN')).toBe('Devolução');
  });
});

describe('calculatePeriodTotals', () => {
  it('calcula entrou (entradas - estornos), vendeu (vendas - devoluções) e ajustou (contagens)', () => {
    const rows: RawStockMovementRecord[] = [
      rawRow({
        id: 1,
        kind: 'ENTRY',
        quantity: '10',
        createdAt: new Date('2026-11-01T12:00:00Z'),
      }),
      rawRow({
        id: 2,
        kind: 'REVERSAL',
        quantity: '-2',
        createdAt: new Date('2026-11-02T12:00:00Z'),
      }),
      rawRow({
        id: 3,
        kind: 'SALE',
        quantity: '-5',
        createdAt: new Date('2026-11-03T12:00:00Z'),
      }),
      rawRow({
        id: 4,
        kind: 'SALE_RETURN',
        quantity: '1',
        createdAt: new Date('2026-11-04T12:00:00Z'),
      }),
      rawRow({
        id: 5,
        kind: 'COUNT',
        quantity: '-1.5',
        createdAt: new Date('2026-11-05T12:00:00Z'),
      }),
    ];
    const grouped = groupMovementsByOperation(rows);
    const totals = calculatePeriodTotals(
      grouped,
      { from: '2026-11-01', to: '2026-11-05' },
      TIME_ZONE,
    );

    expect(totals).toEqual({
      entered: '8',
      sold: '4',
      adjusted: '-1.5',
    });
  });

  it('ignora movimentações fora do período solicitado nas somas', () => {
    const rows: RawStockMovementRecord[] = [
      rawRow({
        id: 1,
        kind: 'ENTRY',
        quantity: '10',
        createdAt: new Date('2026-10-01T12:00:00Z'),
      }),
      rawRow({
        id: 2,
        kind: 'ENTRY',
        quantity: '6',
        createdAt: new Date('2026-11-01T12:00:00Z'),
      }),
    ];
    const grouped = groupMovementsByOperation(rows);
    const totals = calculatePeriodTotals(
      grouped,
      { from: '2026-11-01', to: '2026-11-30' },
      TIME_ZONE,
    );

    expect(totals.entered).toBe('6');
  });
});

describe('filterMovements', () => {
  it('filtra por tipo e período devolvendo as mais recentes primeiro', () => {
    const rows: RawStockMovementRecord[] = [
      rawRow({
        id: 1,
        kind: 'ENTRY',
        quantity: '10',
        createdAt: new Date('2026-11-01T12:00:00Z'),
      }),
      rawRow({
        id: 2,
        kind: 'SALE',
        quantity: '-2',
        createdAt: new Date('2026-11-02T12:00:00Z'),
      }),
      rawRow({
        id: 3,
        kind: 'SALE',
        quantity: '-3',
        createdAt: new Date('2026-11-03T12:00:00Z'),
      }),
    ];
    const grouped = groupMovementsByOperation(rows);
    const history = buildMovementHistory(grouped);
    const filtered = filterMovements(
      history,
      grouped,
      { kind: 'SALE' },
      TIME_ZONE,
    );

    expect(filtered.map((f) => f.id)).toEqual([3, 2]);
  });
});

describe('parseMovementsQuery', () => {
  it('aceita consulta vazia ou com parâmetros válidos', () => {
    expect(parseMovementsQuery({})).toEqual({});
    expect(
      parseMovementsQuery({
        from: '2026-11-01',
        to: '2026-11-30',
        kind: 'ENTRY',
      }),
    ).toEqual({
      from: '2026-11-01',
      to: '2026-11-30',
      kind: 'ENTRY',
    });
  });

  it('rejeita data inválida citando o valor recebido e o formato esperado', () => {
    expect(() => parseMovementsQuery({ from: 'invalido' })).toThrow(
      new BadRequestException(
        'Parâmetro "from" inválido: recebido "invalido", esperado data no formato YYYY-MM-DD (ex.: 2026-09-22)',
      ),
    );
    expect(() => parseMovementsQuery({ to: '2026-02-31' })).toThrow(
      BadRequestException,
    );
  });

  it('rejeita intervalo onde from é posterior a to', () => {
    expect(() =>
      parseMovementsQuery({ from: '2026-11-10', to: '2026-11-05' }),
    ).toThrow(
      new BadRequestException(
        'Intervalo de datas inválido: "from" (2026-11-10) é posterior a "to" (2026-11-05); esperado from <= to',
      ),
    );
  });

  it('rejeita tipo inválido citando o valor recebido e os tipos esperados', () => {
    expect(() => parseMovementsQuery({ kind: 'INVALIDO' })).toThrow(
      new BadRequestException(
        'Tipo de movimento inválido: recebido "INVALIDO", esperado um de ENTRY, COUNT, REVERSAL, SALE, SALE_RETURN',
      ),
    );
  });
});

describe('buildSupplyMovementsReport', () => {
  it('gera relatório completo com insumo, totais e movimentos', () => {
    const report = buildSupplyMovementsReport(
      {
        supply: { id: 10, name: 'Refrigerante', countUnit: 'un' },
        movements: [
          rawRow({
            id: 1,
            kind: 'ENTRY',
            quantity: '10',
            createdAt: new Date('2026-11-01T12:00:00Z'),
          }),
        ],
      },
      {},
      TIME_ZONE,
    );

    expect(report.supply.name).toBe('Refrigerante');
    expect(report.totals.entered).toBe('10');
    expect(report.movements).toHaveLength(1);
    expect(report.movements[0].balanceAfter).toBe('10');
  });
});
