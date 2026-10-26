import type { FiadoDebtor } from '../api/fiado-types';
import { orderFixture } from '../test-support/order-fixture';
import { fiadoDebtText } from './fiado-debt';

const MARIA: FiadoDebtor = {
  customerId: 15,
  name: 'Maria',
  phone: null,
  openTotal: '30.00',
  orders: [],
};

const editingFiado = orderFixture({
  id: 7,
  customerId: 15,
  paymentMethodId: 7,
  fiado: {
    dueDate: null,
    paidTotal: '0.00',
    remaining: '17.80',
    customerOpenTotal: '47.80',
  },
});

describe('fiadoDebtText', () => {
  it('cliente achado que deve: quanto já deve', () => {
    expect(fiadoDebtText(15, [MARIA], null)).toBe('Já deve R$ 30,00 no fiado.');
  });

  it('sem cliente ou sem dívida, nada', () => {
    expect(fiadoDebtText(null, [MARIA], null)).toBeNull();
    expect(fiadoDebtText(16, [MARIA], null)).toBeNull();
  });

  it('editando o fiado do mesmo cliente: o total já conta este pedido', () => {
    expect(fiadoDebtText(15, [MARIA], editingFiado)).toBe(
      'Deve R$ 47,80 no fiado, com este pedido.',
    );
  });

  it('editando o fiado de outro cliente: o que o achado deve', () => {
    const other = { ...MARIA, customerId: 16 };
    expect(fiadoDebtText(16, [other], editingFiado)).toBe(
      'Já deve R$ 30,00 no fiado.',
    );
  });
});
