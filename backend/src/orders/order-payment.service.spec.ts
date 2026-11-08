import {
  BadRequestException,
  ConflictException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { vi } from 'vitest';
import {
  ADMIN,
  build,
  CAIXA,
  COUNTER,
  DELIVERY,
  TWO_X_SALADA,
} from './order-fakes.fixture.js';

/** Conta aberta: pedido COUNTER sem forma de pagamento. */
const OPEN_ACCOUNT = {
  items: TWO_X_SALADA,
  type: 'COUNTER',
  paymentMethodId: null,
  counterName: 'João',
};

async function createOpen(fakes: ReturnType<typeof build>) {
  return fakes.service.create(CAIXA, OPEN_ACCOUNT);
}

describe('OrderPaymentService.receive — sucesso', () => {
  it('dinheiro com troco: grava a forma e o troco, resposta com fiado null', async () => {
    const fakes = build();
    const created = await createOpen(fakes);
    const result = await fakes.payments.receive(CAIXA, created.id, {
      paymentMethodId: 2,
      changeFor: '50.00',
    });
    expect(result.paymentMethodId).toBe(2);
    expect(result.changeFor).toBe('50.00');
    expect(result.paymentMode).toBeNull();
    expect(result.fiado).toBeNull();
  });

  it('maquininha com meio: grava a forma e o meio', async () => {
    const fakes = build();
    const created = await createOpen(fakes);
    const result = await fakes.payments.receive(CAIXA, created.id, {
      paymentMethodId: 3,
      paymentMode: 'DEBIT',
    });
    expect(result.paymentMethodId).toBe(3);
    expect(result.paymentMode).toBe('DEBIT');
  });

  it('admin também pode receber o A pagar', async () => {
    const fakes = build();
    const created = await createOpen(fakes);
    const result = await fakes.payments.receive(ADMIN, created.id, {
      paymentMethodId: 1,
    });
    expect(result.paymentMethodId).toBe(1);
  });

  it('grava o evento EDITED com before/after (só a forma muda)', async () => {
    const fakes = build();
    const created = await createOpen(fakes);
    await fakes.payments.receive(CAIXA, created.id, { paymentMethodId: 1 });
    const events = await fakes.orders.listEvents(created.id);
    const edited = events.find((e) => e.details.kind === 'EDITED');
    expect(edited).toBeDefined();
    expect(edited!.details).toMatchObject({
      kind: 'EDITED',
      before: { paymentMethodId: null },
      after: { paymentMethodId: 1 },
    });
  });
});

describe('OrderPaymentService.receive — erros', () => {
  it('409 quando o pedido já foi pago', async () => {
    const fakes = build();
    const created = await createOpen(fakes);
    await fakes.payments.receive(CAIXA, created.id, { paymentMethodId: 1 });
    await expect(
      fakes.payments.receive(CAIXA, created.id, { paymentMethodId: 2 }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('409 quando o pedido é uma entrega (não é A pagar)', async () => {
    const fakes = build();
    const created = await fakes.service.create(CAIXA, DELIVERY);
    await expect(
      fakes.payments.receive(CAIXA, created.id, { paymentMethodId: 1 }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('409 quando o pedido de balcão já tem forma (não é A pagar)', async () => {
    const fakes = build();
    const created = await fakes.service.create(CAIXA, COUNTER);
    await expect(
      fakes.payments.receive(CAIXA, created.id, { paymentMethodId: 1 }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('409 quando outra tela recebe entre a leitura e a gravação', async () => {
    const fakes = build();
    const created = await createOpen(fakes);
    const receive = fakes.orders.receivePayment.bind(fakes.orders);
    // A outra tela grava logo antes desta: a gravação condicional não acha mais o A pagar.
    vi.spyOn(fakes.orders, 'receivePayment').mockImplementationOnce(
      async (id, fields, event) => {
        await receive(id, { ...fields, paymentMethodId: 1 }, event);
        return receive(id, fields, event);
      },
    );
    await expect(
      fakes.payments.receive(CAIXA, created.id, { paymentMethodId: 2 }),
    ).rejects.toThrow(/já foi recebido/);
  });

  it('422 forma fiado: vai pelo Editar', async () => {
    const fakes = build();
    const created = await createOpen(fakes);
    await expect(
      fakes.payments.receive(CAIXA, created.id, { paymentMethodId: 4 }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('400 meio na forma errada (maquininha sem meio)', async () => {
    const fakes = build();
    const created = await createOpen(fakes);
    await expect(
      fakes.payments.receive(CAIXA, created.id, {
        paymentMethodId: 1,
        paymentMode: 'PIX',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('422 troco menor que o total', async () => {
    const fakes = build();
    const created = await createOpen(fakes);
    // O total de 2× X Salada é 35.60; troco de 20 é menor.
    await expect(
      fakes.payments.receive(CAIXA, created.id, {
        paymentMethodId: 2,
        changeFor: '20.00',
      }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });
});
