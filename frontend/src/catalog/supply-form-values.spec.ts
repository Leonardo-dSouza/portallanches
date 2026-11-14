import type { Supply } from '../api/types';
import {
  buildSupplyInput,
  describePackages,
  describeSalePrice,
  describeUnitCost,
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
  unitCost: '2.35',
  deductOnSale: true,
  dailyCount: false,
  sectionId: 1,
  active: true,
  packages: [{ name: 'caixa', quantity: '36' }],
  saleProduct: {
    id: 49,
    name: 'Add hamburguer 56g',
    salePrice: '2.50',
  },
};

describe('EMPTY_SUPPLY_FORM', () => {
  it('insumo novo nasce sem baixa (a baixa tira do estoque a cada pedido)', () => {
    expect(EMPTY_SUPPLY_FORM.deductOnSale).toBe(false);
  });
});

describe('buildSupplyInput', () => {
  it('monta o corpo com quantidades no formato da API e sem unitCost', () => {
    const result = buildSupplyInput(
      form({
        countUnit: ' un ',
        minStock: '40',
        packages: [{ name: ' caixa ', quantity: '36' }],
      }),
      true,
      false,
    );
    expect(result).toEqual({
      ok: true,
      value: {
        name: 'Hambúrguer 56g',
        countUnit: 'un',
        minStock: '40',
        deductOnSale: false,
        dailyCount: false,
        sectionId: null,
        active: true,
        packages: [{ name: 'caixa', quantity: '36' }],
      },
    });
    if (result.ok) {
      expect('unitCost' in result.value).toBe(false);
    }
  });

  it('não inclui a chave unitCost no corpo', () => {
    const result = buildSupplyInput(form({}), true, false);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect('unitCost' in result.value).toBe(false);
    }
  });

  it('envia o "contar todo dia"', () => {
    expect(
      buildSupplyInput(form({ dailyCount: true }), true, false),
    ).toMatchObject({ value: { dailyCount: true } });
  });

  it('baixa desligada é enviada', () => {
    expect(
      buildSupplyInput(
        form({ countUnit: 'kg', deductOnSale: false }),
        true,
        false,
      ),
    ).toMatchObject({ value: { deductOnSale: false } });
  });

  it('seção escolhida vira número', () => {
    expect(
      buildSupplyInput(form({ sectionId: '4' }), true, false),
    ).toMatchObject({
      value: { sectionId: 4 },
    });
  });

  it('mínimo em branco vira null e embalagem em branco é ignorada', () => {
    const result = buildSupplyInput(
      form({ minStock: ' ', packages: [{ name: '', quantity: '' }] }),
      false,
      false,
    );
    expect(result).toMatchObject({
      ok: true,
      value: { minStock: null, packages: [], active: false },
    });
  });

  it('aceita mínimo fracionado com vírgula', () => {
    expect(
      buildSupplyInput(form({ countUnit: 'kg', minStock: '2,5' }), true, false),
    ).toMatchObject({ value: { minStock: '2.5' } });
  });

  it.each([
    [{ name: ' ' }, /nome do insumo/],
    [{ countUnit: '' }, /Unidade de contagem inválida/],
    [{ minStock: 'pouco' }, /Estoque mínimo inválido "pouco"/],
    [{ packages: [{ name: 'fardo', quantity: '0' }] }, /embalagem "fardo"/],
    [{ packages: [{ name: '', quantity: '6' }] }, /Nome de embalagem/],
  ])('rejeita %j', (overrides, message) => {
    expect(buildSupplyInput(form(overrides), true, false)).toEqual({
      ok: false,
      error: expect.stringMatching(message),
    });
  });
});

describe('preço de venda', () => {
  it('vai no corpo quando o insumo tem produto 1:1', () => {
    expect(
      buildSupplyInput(form({ salePrice: '7,5' }), true, true),
    ).toMatchObject({ value: { salePrice: '7.50' } });
  });

  it('em branco tira o preço do produto 1:1', () => {
    expect(buildSupplyInput(form({}), true, true)).toMatchObject({
      value: { salePrice: null },
    });
  });

  it('sem produto 1:1 não vai no corpo', () => {
    const built = buildSupplyInput(form({ salePrice: '7' }), true, false);
    expect(built.ok && 'salePrice' in built.value).toBe(false);
  });

  it('preço inválido mostra o texto digitado', () => {
    expect(
      buildSupplyInput(form({ salePrice: 'sete' }), true, true),
    ).toMatchObject({ ok: false, error: expect.stringContaining('"sete"') });
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
      deductOnSale: true,
      dailyCount: false,
      sectionId: '1',
      salePrice: '2,50',
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

describe('describeSalePrice', () => {
  it('mostra o preço do produto 1:1 ou traço', () => {
    expect(describeSalePrice(BURGER)).toBe('R$ 2,50');
    expect(describeSalePrice({ saleProduct: null })).toBe('—');
  });
});

describe('describeUnitCost', () => {
  it('mostra o custo em reais por unidade de contagem', () => {
    expect(describeUnitCost({ countUnit: 'kg', unitCost: '39.9' })).toBe(
      'R$ 39,90 / kg',
    );
    expect(describeUnitCost({ countUnit: 'un', unitCost: '0.0833' })).toBe(
      'R$ 0,0833 / un',
    );
    expect(describeUnitCost({ countUnit: 'un', unitCost: null })).toBe('—');
  });
});
