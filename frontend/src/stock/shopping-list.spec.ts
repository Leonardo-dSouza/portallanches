import type { StockItem } from '../api/types';
import { buildShoppingList } from './shopping-list';

const NO_FLAGS = {
  expired: false,
  expiringSoon: false,
  belowMin: false,
  needsPurchase: false,
};

const item = (
  supplyId: number,
  name: string,
  overrides: Partial<StockItem> = {},
): StockItem => ({
  supplyId,
  name,
  countUnit: 'un',
  minStock: null,
  quantity: '8',
  lots: [],
  nextExpiry: null,
  lastCount: null,
  flags: NO_FLAGS,
  ...overrides,
});

const ITEMS = [
  item(1, 'iT Laranja 2L'),
  item(2, 'Leite condensado', {
    quantity: '2',
    minStock: '4',
    nextExpiry: '2026-09-27',
    flags: { ...NO_FLAGS, belowMin: true, expiringSoon: true },
  }),
  item(3, 'Calabresa fatiada', {
    countUnit: 'kg',
    quantity: '0.5',
    flags: { ...NO_FLAGS, needsPurchase: true },
  }),
  item(4, 'Presunto', {
    countUnit: 'kg',
    quantity: '1.25',
    lastCount: {
      status: 'NOT_COUNTED',
      quantity: null,
      countedAt: '2026-09-25T20:00:00Z',
    },
  }),
];

describe('buildShoppingList', () => {
  it('atenção primeiro, depois o saldo; só os escolhidos', () => {
    expect(buildShoppingList(ITEMS, new Set([1, 2, 3, 4]), '2026-09-25')).toBe(
      [
        'Lista de compras - 25/09/2026 - Sexta',
        '',
        'Precisa de atenção:',
        '- Leite condensado: 2 un (mínimo 4 un, vence 27/09)',
        '- Calabresa fatiada: 0,5 kg (precisa comprar)',
        '',
        'Saldo atual:',
        '- iT Laranja 2L: 8 un',
        '- Presunto: 1,25 kg (não contado)',
        '',
      ].join('\n'),
    );
  });

  it('sem nada de atenção, só a seção de saldo', () => {
    const text = buildShoppingList(ITEMS, new Set([1]), '2026-09-25');
    expect(text).not.toContain('Precisa de atenção');
    expect(text).toContain('- iT Laranja 2L: 8 un');
  });

  it('nada escolhido = texto vazio', () => {
    expect(buildShoppingList(ITEMS, new Set(), '2026-09-25')).toBe('');
  });

  it('vencido aparece com a data', () => {
    const expired = item(5, 'Queijo', {
      nextExpiry: '2026-09-20',
      flags: { ...NO_FLAGS, expired: true },
    });
    expect(buildShoppingList([expired], new Set([5]), '2026-09-25')).toContain(
      '- Queijo: 8 un (vencido em 20/09)',
    );
  });
});
