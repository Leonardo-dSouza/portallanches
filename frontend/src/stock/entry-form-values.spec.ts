import type { Supply } from '../api/types';
import {
  buildEntryInput,
  EMPTY_ENTRY_FORM,
  entryPreview,
  type EntryFormValues,
} from './entry-form-values';

const SODA: Supply = {
  id: 3,
  name: 'iT Laranja 2L',
  countUnit: 'un',
  minStock: null,
  active: true,
  packages: [{ name: 'fardo', quantity: '6' }],
};

const values = (overrides: Partial<EntryFormValues>): EntryFormValues => ({
  ...EMPTY_ENTRY_FORM,
  supplyId: '3',
  amount: '2',
  ...overrides,
});

describe('buildEntryInput', () => {
  it('monta a entrada em embalagem com validade', () => {
    expect(
      buildEntryInput(
        values({ packageName: 'fardo', expiresOn: '2026-10-15' }),
      ),
    ).toEqual({
      ok: true,
      value: {
        supplyId: 3,
        amount: '2',
        packageName: 'fardo',
        expiresOn: '2026-10-15',
      },
    });
  });

  it('sem embalagem e sem validade vão como null', () => {
    expect(buildEntryInput(values({ amount: '1,5' }))).toMatchObject({
      value: { amount: '1.5', packageName: null, expiresOn: null },
    });
  });

  it.each([
    [{ supplyId: '' }, /Escolha o insumo/],
    [{ amount: '0' }, /Quantidade inválida "0"/],
    [{ amount: 'dois' }, /Quantidade inválida "dois"/],
    [{ expiresOn: '2026-02-30' }, /Validade inválida/],
  ])('rejeita %j', (overrides, message) => {
    expect(buildEntryInput(values(overrides))).toEqual({
      ok: false,
      error: expect.stringMatching(message),
    });
  });
});

describe('entryPreview', () => {
  it('converte embalagens para a unidade de contagem', () => {
    expect(entryPreview(values({ packageName: 'fardo' }), SODA)).toBe('12 un');
    expect(entryPreview(values({ amount: '2,5' }), SODA)).toBe('2,5 un');
  });

  it('sem insumo ou quantidade inválida não mostra prévia', () => {
    expect(entryPreview(values({}), undefined)).toBeNull();
    expect(entryPreview(values({ amount: 'x' }), SODA)).toBeNull();
  });
});
