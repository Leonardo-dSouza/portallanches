import { UnprocessableEntityException } from '@nestjs/common';
import { build, CAIXA, DELIVERY, TWO_X_SALADA } from './order-fakes.fixture.js';

/** Balcão aberto no nome: paga no fim (decisão do usuário, 2026-10-10). */
const OPEN_COUNTER = {
  items: TWO_X_SALADA,
  type: 'COUNTER',
  paymentMethodId: null,
  counterName: 'Maria',
};

describe('OrderService: conta aberta no balcão', () => {
  it('grava sem forma de pagamento, com o nome e sem cliente', async () => {
    const order = await build().service.create(CAIXA, OPEN_COUNTER);
    expect(order).toMatchObject({
      paymentMethodId: null,
      paymentMode: null,
      customerId: null,
      customerName: 'Maria',
    });
  });

  it('receber depois: a edição com a forma fecha a conta e mantém o nome', async () => {
    const { service } = build();
    const open = await service.create(CAIXA, OPEN_COUNTER);
    const paid = await service.replace(CAIXA, open.id, {
      ...OPEN_COUNTER,
      paymentMethodId: 1,
    });
    expect(paid).toMatchObject({ paymentMethodId: 1, customerName: 'Maria' });
  });
});

describe('OrderService: troco na entrega em dinheiro', () => {
  it('grava o "Troco para" quando a forma é dinheiro', async () => {
    const order = await build().service.create(CAIXA, {
      ...DELIVERY,
      paymentMethodId: 2,
      changeFor: '50',
    });
    expect(order.changeFor).toBe('50.00');
  });

  it('recusa troco em forma que não é dinheiro', async () => {
    await expect(
      build().service.create(CAIXA, { ...DELIVERY, changeFor: '50' }),
    ).rejects.toThrow(/forma 1 não é dinheiro/);
  });

  it('recusa troco menor que o total, com os dois valores', async () => {
    // 2 × 17,80 + taxa 3,00 = 38,60
    await expect(
      build().service.create(CAIXA, {
        ...DELIVERY,
        paymentMethodId: 2,
        changeFor: '20',
      }),
    ).rejects.toThrow(
      new UnprocessableEntityException(
        'Troco para 20.00 é menor que o total 38.60: esperado valor maior ou igual ao total',
      ),
    );
  });
});
