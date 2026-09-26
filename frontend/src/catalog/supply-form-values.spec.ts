import type { Supply } from '../api/types';
import {
  buildSupplyInput,
  describePackages,
  EMPTY_SUPPLY_FORM,
  supplyFormValuesOf,
  type SupplyFormValues,
} from './supply-form-values';

const form = (overrides: Partial<SupplyFormValues>): SupplyFormValues => ({
  ...EMPTY_SUPPLY_FORM,
  name: 'Hambúrguer 56g',
  ...overrides,
});

const BURGER: Supply = {
  id: 3,
  name: 'Hambúrguer 56g',
  countUnit: 'un',
  minStock: '40',
  active: true,
  packages: [{ name: 'caixa', quantity: '36' }],
};

describe('buildSupplyInput', () => {
  it('monta o corpo com quantidades no formato da API', () => {
    expect(
      buildSupplyInput(
        form({
          countUnit: ' un ',
          minStock: '40',
          packages: [{ name: ' caixa ', quantity: '36' }],
        }),
        true,
      ),
    ).toEqual({
      ok: true,
      value: {
        name: 'Hambúrguer 56g',
        countUnit: 'un',
        minStock: '40',
        active: true,
        packages: [{ name: 'caixa', quantity: '36' }],
      },
    });
  });

  it('mínimo em branco vira null e embalagem em branco é ignorada', () => {
    const result = buildSupplyInput(
      form({ minStock: ' ', packages: [{ name: '', quantity: '' }] }),
      false,
    );
    expect(result).toMatchObject({
      ok: true,
      value: { minStock: null, packages: [], active: false },
    });
  });

  it('aceita mínimo fracionado com vírgula', () => {
    expect(
      buildSupplyInput(form({ countUnit: 'kg', minStock: '2,5' }), true),
    ).toMatchObject({ value: { minStock: '2.5' } });
  });

  it.each([
    [{ name: ' ' }, /nome do insumo/],
    [{ countUnit: '' }, /Unidade de contagem inválida/],
    [{ minStock: 'pouco' }, /Estoque mínimo inválido "pouco"/],
    [{ packages: [{ name: 'fardo', quantity: '0' }] }, /embalagem "fardo"/],
    [{ packages: [{ name: '', quantity: '6' }] }, /Nome de embalagem/],
  ])('rejeita %j', (overrides, message) => {
    expect(buildSupplyInput(form(overrides), true)).toEqual({
      ok: false,
      error: expect.stringMatching(message),
    });
  });
});

describe('supplyFormValuesOf e describePackages', () => {
  it('abre o insumo para edição com vírgula decimal', () => {
    expect(
      supplyFormValuesOf({ ...BURGER, minStock: '2.5', countUnit: 'kg' }),
    ).toEqual({
      name: 'Hambúrguer 56g',
      countUnit: 'kg',
      minStock: '2,5',
      packages: [{ name: 'caixa', quantity: '36' }],
    });
  });

  it('descreve as embalagens na unidade de contagem', () => {
    expect(
      describePackages({
        ...BURGER,
        packages: [...BURGER.packages, { name: 'fardo', quantity: '6' }],
      }),
    ).toBe('caixa = 36 un, fardo = 6 un');
    expect(describePackages({ ...BURGER, packages: [] })).toBe('—');
  });
});
