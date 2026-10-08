import type { PaymentMethod } from '../api/types';
import { describePayment, missingPaymentMode } from './payment-choice';

const PIX: PaymentMethod = {
  id: 1,
  name: 'PIX',
  active: true,
  sortOrder: 0,
  isCardTerminal: false,
};
const TOM: PaymentMethod = {
  id: 3,
  name: 'Maquininha Ton',
  active: true,
  sortOrder: 2,
  isCardTerminal: true,
};

describe('describePayment', () => {
  it('maquininha com o meio; forma comum só com o nome; sem forma vira traço', () => {
    expect(describePayment(TOM, 'DEBIT')).toBe('Maquininha Ton · Débito');
    expect(describePayment(PIX, null)).toBe('PIX');
    expect(describePayment(undefined, null)).toBe('—');
  });
});

describe('missingPaymentMode', () => {
  it('maquininha sem o meio pede crédito, débito ou PIX citando a maquininha', () => {
    const methods = [PIX, TOM];
    expect(
      missingPaymentMode({ paymentMethodId: '3', paymentMode: '' }, methods),
    ).toBe('Escolha crédito, débito ou PIX na Maquininha Ton (teclas 1 a 3)');
    expect(
      missingPaymentMode({ paymentMethodId: '3', paymentMode: 'PIX' }, methods),
    ).toBeNull();
    expect(
      missingPaymentMode({ paymentMethodId: '1', paymentMode: '' }, methods),
    ).toBeNull();
  });
});
