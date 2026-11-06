import type { Customer, DeliveryZone } from '../api/types';
import {
  addressDiffersFromRecord,
  applyHomonymAnswer,
  recordAddressLabel,
  typedAddressLabel,
} from './homonym-address';
import { EMPTY_ORDER_FORM, type OrderFormValues } from './order-form-values';

const ZONES: DeliveryZone[] = [
  {
    id: 1,
    neighborhood: 'Monterrey',
    neighborhoodKey: 'monterrey',
    fee: '3.00',
    active: true,
  },
  {
    id: 2,
    neighborhood: 'São José',
    neighborhoodKey: 'sao jose',
    fee: '5.00',
    active: true,
  },
];

const THIAGO: Customer = {
  id: 7,
  name: 'Thiago',
  phone: null,
  street: 'Rua das Flores',
  number: '12',
  reference: 'casa azul',
  deliveryZoneId: 1,
};

function typed(fields: Partial<OrderFormValues>): OrderFormValues {
  return {
    ...EMPTY_ORDER_FORM,
    type: 'DELIVERY',
    customerName: 'Thiago',
    street: 'Rua das Flores',
    houseNumber: '12',
    reference: 'casa azul',
    neighborhood: 'Monterrey',
    ...fields,
  };
}

describe('addressDiffersFromRecord (S5-11: homônimo sem telefone)', () => {
  it('mesmo endereço, com maiúsculas, acento e espaços diferentes, não conta', () => {
    const values = typed({
      street: '  rua  das flores ',
      houseNumber: ' 12 ',
      neighborhood: 'MONTERREY',
    });
    expect(addressDiffersFromRecord(THIAGO, values, ZONES)).toBe(false);
  });

  it('só a referência diferente não conta (ela muda à toa)', () => {
    const values = typed({ reference: 'portão verde' });
    expect(addressDiffersFromRecord(THIAGO, values, ZONES)).toBe(false);
  });

  it('outra rua conta', () => {
    const values = typed({ street: 'Rua B' });
    expect(addressDiffersFromRecord(THIAGO, values, ZONES)).toBe(true);
  });

  it('outro número conta; "sn" e "S/N" são o mesmo', () => {
    expect(
      addressDiffersFromRecord(THIAGO, typed({ houseNumber: '30' }), ZONES),
    ).toBe(true);
    const noNumber = { ...THIAGO, number: 'S/N' };
    expect(
      addressDiffersFromRecord(noNumber, typed({ houseNumber: 'sn' }), ZONES),
    ).toBe(false);
  });

  it('outro bairro conta, cadastrado ou novo', () => {
    expect(
      addressDiffersFromRecord(
        THIAGO,
        typed({ neighborhood: 'São José' }),
        ZONES,
      ),
    ).toBe(true);
    expect(
      addressDiffersFromRecord(
        THIAGO,
        typed({ neighborhood: 'Centro' }),
        ZONES,
      ),
    ).toBe(true);
  });

  it('cadastro sem endereço (só fiado no balcão) conta quando a entrega tem rua', () => {
    const counterOnly = {
      ...THIAGO,
      street: null,
      number: null,
      reference: null,
      deliveryZoneId: null,
    };
    expect(addressDiffersFromRecord(counterOnly, typed({}), ZONES)).toBe(true);
  });
});

describe('applyHomonymAnswer', () => {
  const withPhone = { ...THIAGO, phone: '79999991234' };
  const resolved = {
    known: withPhone,
    values: typed({ phone: '79999991234', street: 'Rua B' }),
  };

  it('mesma pessoa: segue com o cadastro achado', () => {
    expect(applyHomonymAnswer(resolved, 'same')).toBe(resolved);
  });

  it('outra pessoa: cliente novo, sem o telefone que veio do cadastro', () => {
    expect(applyHomonymAnswer(resolved, 'other')).toEqual({
      known: null,
      values: { ...resolved.values, phone: '' },
    });
  });
});

describe('endereços da pergunta', () => {
  it('o do cadastro com o bairro; null quando não tem rua', () => {
    expect(recordAddressLabel(THIAGO, ZONES)).toBe(
      'Rua das Flores, 12 · Monterrey',
    );
    const counterOnly = { ...THIAGO, street: null, deliveryZoneId: null };
    expect(recordAddressLabel(counterOnly, ZONES)).toBeNull();
  });

  it('o digitado, aparado e com o "sem número" padronizado', () => {
    const values = typed({
      street: ' Rua B ',
      houseNumber: 'sn',
      neighborhood: ' Centro ',
    });
    expect(typedAddressLabel(values)).toBe('Rua B, S/N · Centro');
  });
});
