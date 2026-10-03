import { buildStockItem, type SupplySnapshot } from './stock-status.js';

const TODAY = '2026-09-25';

const snapshot = (overrides: Partial<SupplySnapshot>): SupplySnapshot => ({
  supplyId: 1,
  name: 'Refrigerante iT Laranja 2L',
  sectionId: 3,
  countUnit: 'un',
  minStock: null,
  lots: [],
  lastCount: null,
  lastEntryAt: null,
  ...overrides,
});

const lot = (id: number, remainingMilli: number, expiresOn: string | null) => ({
  id,
  remainingMilli,
  expiresOn,
});

describe('buildStockItem', () => {
  it('soma os lotes com saldo e mostra a validade mais próxima', () => {
    const item = buildStockItem(
      snapshot({
        lots: [
          lot(2, 6000, '2026-10-15'),
          lot(1, 2500, '2026-10-20'),
          lot(3, 0, '2026-09-01'),
        ],
      }),
      TODAY,
    );
    expect(item).toMatchObject({
      quantity: '8.5',
      nextExpiry: '2026-10-15',
      lots: [
        { id: 2, remaining: '6', expiresOn: '2026-10-15' },
        { id: 1, remaining: '2.5', expiresOn: '2026-10-20' },
      ],
    });
  });

  it.each([
    ['2026-09-24', { expired: true, expiringSoon: false }],
    ['2026-09-25', { expired: false, expiringSoon: true }],
    ['2026-10-02', { expired: false, expiringSoon: true }],
    ['2026-10-03', { expired: false, expiringSoon: false }],
  ])('validade %s → %j', (expiresOn, flags) => {
    const item = buildStockItem(
      snapshot({ lots: [lot(1, 1000, expiresOn)] }),
      TODAY,
    );
    expect(item.flags).toMatchObject(flags);
  });

  it('abaixo do mínimo compara na unidade de contagem, inclusive sem lotes', () => {
    const lots = [lot(1, 3000, null)];
    expect(
      buildStockItem(snapshot({ lots, minStock: '4' }), TODAY).flags.belowMin,
    ).toBe(true);
    expect(
      buildStockItem(snapshot({ lots, minStock: '3' }), TODAY).flags.belowMin,
    ).toBe(false);
    expect(
      buildStockItem(snapshot({ minStock: '1' }), TODAY).flags.belowMin,
    ).toBe(true);
    expect(buildStockItem(snapshot({ lots }), TODAY).flags.belowMin).toBe(
      false,
    );
  });

  it('"precisa comprar" some quando entra estoque depois da contagem', () => {
    const lastCount = {
      status: 'NEEDS_PURCHASE' as const,
      quantity: null,
      countedAt: '2026-09-24T23:00:00.000Z',
    };
    const flag = (lastEntryAt: string | null) =>
      buildStockItem(snapshot({ lastCount, lastEntryAt }), TODAY).flags
        .needsPurchase;
    expect(flag(null)).toBe(true);
    expect(flag('2026-09-20T10:00:00.000Z')).toBe(true);
    expect(flag('2026-09-25T10:00:00.000Z')).toBe(false);
  });

  it('lote sem validade não gera alerta de validade', () => {
    const item = buildStockItem(
      snapshot({ lots: [lot(1, 1000, null)] }),
      TODAY,
    );
    expect(item).toMatchObject({
      nextExpiry: null,
      flags: { expired: false, expiringSoon: false },
    });
  });

  it('repassa a seção do insumo', () => {
    expect(buildStockItem(snapshot({}), TODAY).sectionId).toBe(3);
  });
});
