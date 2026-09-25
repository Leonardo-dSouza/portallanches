import type { Customer, Order } from '../api/types';
import {
  buildCustomerDraft,
  customerOfOrder,
  phoneDigits,
} from './customer-draft';

const ANA: Customer = {
  id: 7,
  name: 'Ana',
  phone: '79999991234',
  street: 'Rua A',
  deliveryZoneId: 1,
};

const typed = {
  phone: '(79) 99999-1234',
  customerName: ' Ana ',
  street: 'Rua A ',
};

describe('buildCustomerDraft', () => {
  it('cliente cadastrado sem mudanças é reaproveitado sem gravar', () => {
    expect(buildCustomerDraft(typed, ANA, 1)).toEqual({
      ok: true,
      draft: {
        id: 7,
        name: 'Ana',
        phone: '79999991234',
        street: 'Rua A',
        changed: false,
      },
    });
  });

  it('rua ou bairro diferente marca o cadastro para atualizar', () => {
    const moved = buildCustomerDraft({ ...typed, street: 'Rua B' }, ANA, 1);
    expect(moved).toMatchObject({ draft: { id: 7, changed: true } });
    expect(buildCustomerDraft(typed, ANA, 2)).toMatchObject({
      draft: { changed: true },
    });
    expect(buildCustomerDraft(typed, ANA, null)).toMatchObject({
      draft: { changed: true },
    });
  });

  it('cliente novo pode ficar sem telefone', () => {
    expect(buildCustomerDraft({ ...typed, phone: ' ' }, null, 1)).toEqual({
      ok: true,
      draft: {
        id: null,
        name: 'Ana',
        phone: null,
        street: 'Rua A',
        changed: true,
      },
    });
  });

  it.each([
    [{ phone: '1234' }, /Telefone inválido "1234"/],
    [{ customerName: ' ' }, /nome do cliente/],
    [{ street: '' }, /rua da entrega/],
  ])('rejeita %j', (overrides, message) => {
    expect(buildCustomerDraft({ ...typed, ...overrides }, null, 1)).toEqual({
      ok: false,
      error: expect.stringMatching(message),
    });
  });
});

describe('customerOfOrder', () => {
  it('monta o cliente de referência a partir da cópia no pedido', () => {
    const order = {
      customerId: 7,
      customerName: 'Ana',
      customerPhone: '79999991234',
      customerStreet: 'Rua A',
      deliveryZoneId: 1,
    } as Order;
    expect(customerOfOrder(order)).toEqual(ANA);
    expect(customerOfOrder({ ...order, customerId: null })).toBeNull();
  });
});

it('phoneDigits tira pontuação e espaços', () => {
  expect(phoneDigits('(79) 9 9999-1234')).toBe('79999991234');
});
