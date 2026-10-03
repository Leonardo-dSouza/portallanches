import type { Supply } from '../api/types';
import {
  BLANK_ENTRY_ROW,
  buildEntryItem,
  buildEntryItems,
  entryPreview,
  isRowTouched,
  type EntryRowValues,
} from './entry-form-values';

const SODA: Supply = {
  id: 3,
  name: 'iT Laranja 2L',
  countUnit: 'un',
  minStock: null,
  unitCost: null,
  deductOnSale: true,
  dailyCount: false,
  sectionId: null,
  saleProduct: null,
  active: true,
  packages: [{ name: 'fardo', quantity: '6' }],
};

const row = (overrides: Partial<EntryRowValues>): EntryRowValues => ({
  ...BLANK_ENTRY_ROW,
  amount: '2',
  ...overrides,
});

describe('buildEntryItem', () => {
  it('monta a linha em embalagem com validade e valor pago', () => {
    expect(
      buildEntryItem(
        3,
        SODA.name,
        row({ packageName: 'fardo', expiresOn: '2026-10-15', paid: '49,90' }),
      ),
    ).toEqual({
      ok: true,
      value: {
        supplyId: 3,
        amount: '2',
        packageName: 'fardo',
        expiresOn: '2026-10-15',
        paid: '49.90',
        paidPer: 'total',
      },
    });
  });

  it('sem embalagem, validade e valor vão como null', () => {
    expect(buildEntryItem(3, SODA.name, row({ amount: '1,5' }))).toMatchObject({
      value: { amount: '1.5', packageName: null, expiresOn: null, paid: null },
    });
  });

  it.each([
    [{ amount: '0' }, /iT Laranja 2L: quantidade inválida "0"/],
    [{ amount: 'dois' }, /quantidade inválida "dois"/],
    [{ expiresOn: '2026-02-30' }, /validade inválida/],
    [{ paid: 'R$ 50' }, /valor pago inválido "R\$ 50"/],
  ])('rejeita %j com o nome do insumo', (overrides, message) => {
    expect(buildEntryItem(3, SODA.name, row(overrides))).toEqual({
      ok: false,
      error: expect.stringMatching(message),
    });
  });
});

describe('buildEntryItems', () => {
  const nameOf = (id: number) => (id === 3 ? SODA.name : `#${id}`);

  it('só as linhas tocadas entram na compra', () => {
    const rows = new Map([
      [3, row({})],
      [4, BLANK_ENTRY_ROW],
    ]);
    expect(buildEntryItems(rows, nameOf)).toMatchObject({
      ok: true,
      value: [{ supplyId: 3 }],
    });
  });

  it('valor pago sem quantidade é erro, não some', () => {
    const rows = new Map([[4, { ...BLANK_ENTRY_ROW, paid: '10' }]]);
    expect(buildEntryItems(rows, nameOf)).toMatchObject({
      ok: false,
      error: expect.stringContaining('#4: quantidade inválida ""'),
    });
  });

  it('sem nenhuma linha avisa o que digitar', () => {
    expect(buildEntryItems(new Map(), nameOf)).toEqual({
      ok: false,
      error: 'Digite a quantidade de ao menos um insumo',
    });
  });
});

describe('isRowTouched', () => {
  it('linha em branco (com "total" padrão) não conta', () => {
    expect(isRowTouched(BLANK_ENTRY_ROW)).toBe(false);
    expect(isRowTouched({ ...BLANK_ENTRY_ROW, expiresOn: '2026-10-01' })).toBe(
      true,
    );
  });
});

describe('entryPreview', () => {
  it('converte embalagens para a unidade de contagem', () => {
    expect(entryPreview(row({ packageName: 'fardo' }), SODA)).toBe('12 un');
    expect(entryPreview(row({ amount: '2,5' }), SODA)).toBe('2,5 un');
  });

  it('sem insumo ou quantidade inválida não mostra prévia', () => {
    expect(entryPreview(row({}), undefined)).toBeNull();
    expect(entryPreview(row({ amount: 'x' }), SODA)).toBeNull();
  });
});
