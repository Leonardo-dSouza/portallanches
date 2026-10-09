import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  ADMIN,
  build,
  CAIXA,
  COUNTER,
  DELIVERY,
} from './order-fakes.fixture.js';
import type { OrderData } from './order-repository.js';

describe('OrderService', () => {
  it('grava balcão com taxa zero no fechamento de hoje', async () => {
    const order = await build().service.create(CAIXA, COUNTER);
    expect(order).toMatchObject({
      closingId: 10,
      amount: '35.60',
      deliveryFee: '0.00',
      deliveryZoneId: null,
      items: [
        {
          productId: 9,
          productName: 'X Salada',
          quantity: 2,
          unitPrice: '17.80',
          unitCmv: '2.44',
        },
      ],
    });
  });

  it('o valor da entrega é a soma dos itens + a taxa (o que o cliente pagou)', async () => {
    const order = await build().service.create(CAIXA, DELIVERY);
    expect(order).toMatchObject({ amount: '38.60', deliveryFee: '3.00' });
  });

  it('editar mantém o preço da época das linhas que já estavam', async () => {
    const { service, catalog } = build();
    const created = await service.create(CAIXA, COUNTER);
    catalog.products[0] = { ...catalog.products[0], salePrice: '20.00' };
    const updated = await service.replace(CAIXA, created.id, {
      ...COUNTER,
      items: [
        { productId: 9, quantity: 1 },
        { productId: 60, quantity: 1 },
      ],
    });
    expect(updated.items.map((i) => i.unitPrice)).toEqual(['17.80', '7.00']);
    expect(updated.amount).toBe('24.80');
  });

  it('lança com o preço do dia do caixa (caixa atrasado usa o preço da época)', async () => {
    const { service, catalog } = build();
    await service.create(CAIXA, COUNTER, '2026-09-22');
    expect(catalog.pricedOn).toEqual(['2026-09-22']);
  });

  it('editar pedido antigo busca o preço no dia do pedido', async () => {
    const { service, catalog, orders } = build();
    const created = await service.create(ADMIN, COUNTER);
    orders.records[0].closingId = 11; // fechamento de 2026-08-01
    await service.replace(ADMIN, created.id, COUNTER);
    expect(catalog.pricedOn).toEqual(['2026-09-22', '2026-08-01']);
  });

  it('recusa produto sem preço citando o nome', async () => {
    const { service, catalog } = build();
    catalog.products[1] = { ...catalog.products[1], salePrice: null };
    await expect(
      service.create(CAIXA, {
        ...COUNTER,
        items: [{ productId: 60, quantity: 1 }],
      }),
    ).rejects.toThrow(/Coca Cola 600ml/);
  });

  it('entrega usa o bairro e a taxa do cliente e copia os dados dele', async () => {
    const order = await build().service.create(CAIXA, DELIVERY);
    expect(order).toMatchObject({
      deliveryZoneId: 3,
      deliveryFee: '3.00',
      customerId: 5,
      customerName: 'Ana',
      customerPhone: '79999991234',
      customerStreet: 'Rua A',
      customerNumber: '123',
      customerReference: 'casa azul',
    });
  });

  it('pedido antigo mantém a rua depois que o cliente muda', async () => {
    const { service, catalog } = build();
    const order = await service.create(CAIXA, DELIVERY);
    catalog.customers[0] = { ...catalog.customers[0], street: 'Rua Nova' };
    const [listed] = await service.listFor(CAIXA);
    expect(listed.id).toBe(order.id);
    expect(listed.customerStreet).toBe('Rua A');
  });

  it('balcão grava cliente vazio', async () => {
    const order = await build().service.create(CAIXA, COUNTER);
    expect(order).toMatchObject({
      customerId: null,
      customerName: null,
      customerNumber: null,
      customerReference: null,
    });
  });

  it('respeita a sobrescrita da taxa', async () => {
    const order = await build().service.create(CAIXA, {
      ...DELIVERY,
      deliveryFee: 5,
    });
    expect(order.deliveryFee).toBe('5.00');
  });

  it('rejeita cliente inexistente, bairro do cliente inativo e forma de pagamento inativa', async () => {
    const { service } = build();
    await expect(
      service.create(CAIXA, { ...DELIVERY, customerId: 99 }),
    ).rejects.toThrow(/Cliente 99/);
    await expect(
      service.create(CAIXA, { ...DELIVERY, customerId: 6 }),
    ).rejects.toThrow(/Bairro 4/);
    await expect(
      service.create(CAIXA, { ...COUNTER, paymentMethodId: 9 }),
    ).rejects.toThrow(BadRequestException);
  });

  it('maquininha grava o meio (crédito, débito ou PIX)', async () => {
    const order = await build().service.create(CAIXA, {
      ...COUNTER,
      paymentMethodId: 3,
      paymentMode: 'CREDIT',
    });
    expect(order).toMatchObject({ paymentMethodId: 3, paymentMode: 'CREDIT' });
  });

  it('maquininha sem o meio e forma comum com meio são recusadas', async () => {
    const { service } = build();
    await expect(
      service.create(CAIXA, { ...COUNTER, paymentMethodId: 3 }),
    ).rejects.toThrow(/3 é maquininha: esperado "paymentMode".*recebido null/);
    await expect(
      service.create(CAIXA, { ...COUNTER, paymentMode: 'PIX' }),
    ).rejects.toThrow(/1 não é maquininha.*recebido "PIX"/);
  });

  it('caixa não lança com o fechamento fechado, admin lança', async () => {
    const { service, closings } = build();
    closings.today = { ...closings.today, status: 'CLOSED' };
    await expect(service.create(CAIXA, COUNTER)).rejects.toThrow(
      ForbiddenException,
    );
    await expect(service.create(ADMIN, COUNTER)).resolves.toMatchObject({
      createdById: 1,
    });
  });

  it('substitui um pedido de hoje', async () => {
    const { service } = build();
    const created = await service.create(CAIXA, COUNTER);
    const updated = await service.replace(CAIXA, created.id, DELIVERY);
    expect(updated).toMatchObject({ type: 'DELIVERY', deliveryFee: '3.00' });
  });

  it('caixa não edita pedido de fechamento fora da janela; admin edita', async () => {
    const { service, orders } = build();
    const old = await orders.create(
      5,
      1,
      {
        type: 'COUNTER',
        paymentMethodId: 1,
        paymentMode: null,
        items: [],
        amount: '30.00',
        deliveryZoneId: null,
        deliveryFee: '0.00',
        customerId: null,
        customerName: null,
        customerPhone: null,
        customerStreet: null,
        customerNumber: null,
        customerReference: null,
      } as OrderData,
      null,
    );
    await expect(service.replace(CAIXA, old.id, COUNTER)).rejects.toThrow(
      /2026-08-01/,
    );
    await expect(
      service.replace(ADMIN, old.id, COUNTER),
    ).resolves.toMatchObject({ id: old.id });
  });

  it('lança e lista na data escolhida', async () => {
    const { service, closings } = build();
    await service.create(CAIXA, COUNTER, '2026-09-20');
    await service.listFor(CAIXA, '2026-09-20');
    expect(closings.askedDates).toEqual(['2026-09-20', '2026-09-20']);
  });

  it('remove e retorna 404 para pedido inexistente', async () => {
    const { service, orders } = build();
    const created = await service.create(CAIXA, COUNTER);
    await service.remove(CAIXA, created.id);
    expect(orders.records).toHaveLength(0);
    await expect(service.remove(CAIXA, 77)).rejects.toThrow(NotFoundException);
  });

  it('lista os pedidos de hoje', async () => {
    const { service } = build();
    await service.create(CAIXA, COUNTER);
    expect(await service.listFor(CAIXA)).toHaveLength(1);
  });
});
