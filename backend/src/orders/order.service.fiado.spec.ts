import { UnprocessableEntityException } from '@nestjs/common';
import { build, CAIXA, DELIVERY } from './order-fakes.fixture.js';

// Fiado (pedido do usuário, 2026-10-25): cliente no balcão, previsão e as travas.
describe('OrderService com fiado', () => {
  it('entrega para cliente sem endereço (do balcão) é recusada citando o cliente', async () => {
    const created = build().service.create(CAIXA, {
      ...DELIVERY,
      customerId: 7,
    });
    await expect(created).rejects.toThrow(UnprocessableEntityException);
    await expect(created).rejects.toThrow(
      'Cliente 7 sem endereço: entrega precisa de rua e bairro',
    );
  });
});
