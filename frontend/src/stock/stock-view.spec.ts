import type { StockItem } from '../api/types';
import {
  alertsOf,
  describeLastCount,
  expiryLabel,
  isCritical,
} from './stock-view';

const TODAY = '2026-09-25';
const NO_FLAGS = {
  expired: false,
  expiringSoon: false,
  belowMin: false,
  needsPurchase: false,
  countDue: false,
  oversold: false,
};

const item = (overrides: Partial<StockItem>): StockItem => ({
  supplyId: 1,
  name: 'Leite condensado',
  sectionId: null,
  countUnit: 'un',
  minStock: '4',
  dailyCount: false,
  quantity: '2',
  lots: [],
  nextExpiry: null,
  lastCount: null,
  oversold: null,
  flags: NO_FLAGS,
  ...overrides,
});

describe('expiryLabel', () => {
  it.each([
    ['2026-09-25', 'Vence hoje'],
    ['2026-09-26', 'Vence amanhã'],
    ['2026-09-30', 'Vence em 5 dias (30/09)'],
  ])('%s → %s', (date, label) => {
    expect(expiryLabel(date, TODAY)).toBe(label);
  });
});

describe('alertsOf', () => {
  it('lista do mais grave para o mais brando', () => {
    const alerts = alertsOf(
      item({
        nextExpiry: '2026-09-26',
        flags: {
          expired: false,
          expiringSoon: true,
          belowMin: true,
          needsPurchase: true,
          countDue: true,
          oversold: false,
        },
      }),
      TODAY,
    );
    expect(alerts).toEqual([
      { label: 'Abaixo do mínimo (4 un)', tone: 'danger' },
      { label: 'Vence amanhã', tone: 'warning' },
      { label: 'Precisa comprar', tone: 'warning' },
      { label: 'Contar hoje', tone: 'warning' },
    ]);
  });

  it('venda além do saldo pede conferência com a quantidade', () => {
    const alerts = alertsOf(
      item({ oversold: '3', flags: { ...NO_FLAGS, oversold: true } }),
      TODAY,
    );
    expect(alerts).toEqual([
      { label: 'Conferir: vendeu 3 un além do estoque', tone: 'danger' },
    ]);
  });

  it('vencido mostra a data', () => {
    const alerts = alertsOf(
      item({ nextExpiry: '2026-09-20', flags: { ...NO_FLAGS, expired: true } }),
      TODAY,
    );
    expect(alerts).toEqual([{ label: 'Vencido em 20/09', tone: 'danger' }]);
  });

  it('sem alerta: lista vazia e não é crítico', () => {
    expect(alertsOf(item({}), TODAY)).toEqual([]);
    expect(isCritical(item({}))).toBe(false);
    expect(
      isCritical(item({ flags: { ...NO_FLAGS, needsPurchase: true } })),
    ).toBe(true);
    expect(isCritical(item({ flags: { ...NO_FLAGS, countDue: true } }))).toBe(
      true,
    );
  });
});

describe('describeLastCount', () => {
  const at = '2026-09-25T15:00:00Z';
  it.each([
    [null, 'Nunca contado'],
    [
      { status: 'COUNTED' as const, quantity: '2.5', countedAt: at },
      '2,5 kg em 25/09',
    ],
    [
      { status: 'NOT_COUNTED' as const, quantity: null, countedAt: at },
      'Não contado em 25/09',
    ],
    [
      { status: 'NEEDS_PURCHASE' as const, quantity: null, countedAt: at },
      '"Precisa comprar" em 25/09',
    ],
  ])('%j → %s', (count, text) => {
    expect(describeLastCount(count, 'kg')).toBe(text);
  });
});
