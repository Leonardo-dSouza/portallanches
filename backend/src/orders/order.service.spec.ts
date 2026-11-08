import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
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

  it('grava os itens na ordem das categorias, não na ordem digitada', async () => {
    const order = await build().service.create(CAIXA, {
      ...COUNTER,
      items: [
        { productId: 60, quantity: 1 },
        { productId: 9, quantity: 1 },
      ],
    });
    expect(order.items.map((i) => i.productId)).toEqual([9, 60]);
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
        status: 'DELIVERED',
        changeFor: null,
        fiadoDueDate: null,
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
      {
        userId: 1,
        managerAuthorized: false,
        details: { kind: 'RESTORED' },
      },
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

  it('cancelar não apaga (fica com o motivo) e retorna 404 para pedido inexistente', async () => {
    const { service, cancels, orders } = build();
    const created = await service.create(CAIXA, COUNTER);
    await cancels.cancel(CAIXA, created.id, { reason: 'Lançado errado' });
    expect(orders.records).toHaveLength(1);
    expect(orders.records[0].cancelReason).toBe('Lançado errado');
    await expect(
      cancels.cancel(CAIXA, 77, { reason: 'Lançado errado' }),
    ).rejects.toThrow(NotFoundException);
  });

  it('lista os pedidos de hoje', async () => {
    const { service } = build();
    await service.create(CAIXA, COUNTER);
    expect(await service.listFor(CAIXA)).toHaveLength(1);
  });

  it('grava diningOption no balcão (padrão TAKEAWAY, aceita EAT_IN) e null na entrega', async () => {
    const { service } = build();
    const defaultCounter = await service.create(CAIXA, COUNTER);
    expect(defaultCounter.diningOption).toBe('TAKEAWAY');

    const eatInCounter = await service.create(CAIXA, {
      ...COUNTER,
      diningOption: 'EAT_IN',
    });
    expect(eatInCounter.diningOption).toBe('EAT_IN');

    const delivery = await service.create(CAIXA, DELIVERY);
    expect(delivery.diningOption).toBeNull();
  });

  it('edição de pedido mantém ou troca o diningOption', async () => {
    const { service } = build();
    const created = await service.create(CAIXA, {
      ...COUNTER,
      diningOption: 'EAT_IN',
    });
    expect(created.diningOption).toBe('EAT_IN');

    const updated = await service.replace(CAIXA, created.id, {
      ...COUNTER,
      diningOption: 'TAKEAWAY',
    });
    expect(updated.diningOption).toBe('TAKEAWAY');
  });

  describe('pagamento dividido (card 2, 2026-11-08)', () => {
    const setup50 = () => {
      const fakes = build();
      fakes.catalog.products.push({
        id: 99,
        name: 'Combo Especial',
        menuNumber: 99,
        categoryId: 1,
        categoryName: 'Tradicional',
        categorySortOrder: 1,
        addonCategoryId: null,
        choiceCategoryId: null,
        choiceCategoryName: null,
        isBundle: false,
        salePrice: '50.00',
        active: true,
        components: [],
        removables: [],
      });
      const order50 = {
        items: [{ productId: 99, quantity: 1 }],
        type: 'DELIVERY' as const,
        customerId: 5,
        deliveryFee: 0,
      };
      return { ...fakes, order50 };
    };

    it('criar dividido (PIX 20 + Dinheiro 30, troco 50 ok; troco 25 → 422)', async () => {
      const { service, order50 } = setup50();
      const parts = [
        { paymentMethodId: 1, amount: '20.00' },
        { paymentMethodId: 2, amount: '30.00' },
      ];
      const created = await service.create(CAIXA, {
        ...order50,
        paymentParts: parts,
        changeFor: '50.00',
      });
      expect(created.amount).toBe('50.00');
      expect(created.paymentMethodId).toBe(1);
      expect(created.changeFor).toBe('50.00');
      expect(created.paymentParts).toHaveLength(2);

      await expect(
        service.create(CAIXA, {
          ...order50,
          paymentParts: parts,
          changeFor: '25.00',
        }),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);
    });

    it('soma errada lança 422', async () => {
      const { service, order50 } = setup50();
      const parts = [
        { paymentMethodId: 1, amount: '20.00' },
        { paymentMethodId: 2, amount: '20.00' },
      ];
      await expect(
        service.create(CAIXA, { ...order50, paymentParts: parts }),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);
    });

    it('fiado como parte lança 422', async () => {
      const { service, order50 } = setup50();
      const parts = [
        { paymentMethodId: 1, amount: '20.00' },
        { paymentMethodId: 4, amount: '30.00' },
      ];
      await expect(
        service.create(CAIXA, { ...order50, paymentParts: parts }),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);
    });

    it('dois Dinheiro lança 422', async () => {
      const { service, order50 } = setup50();
      const parts = [
        { paymentMethodId: 2, amount: '20.00' },
        { paymentMethodId: 2, amount: '30.00' },
      ];
      await expect(
        service.create(CAIXA, { ...order50, paymentParts: parts }),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);
    });

    it('dois Ton débito ok', async () => {
      const { service, order50 } = setup50();
      const parts = [
        { paymentMethodId: 3, paymentMode: 'DEBIT' as const, amount: '20.00' },
        { paymentMethodId: 3, paymentMode: 'DEBIT' as const, amount: '30.00' },
      ];
      const created = await service.create(CAIXA, {
        ...order50,
        paymentParts: parts,
      });
      expect(created.paymentMethodId).toBe(3);
      expect(created.paymentParts).toHaveLength(2);
    });

    it('editar de dividido para uma forma limpa as partes', async () => {
      const { service, order50 } = setup50();
      const parts = [
        { paymentMethodId: 1, amount: '20.00' },
        { paymentMethodId: 2, amount: '30.00' },
      ];
      const created = await service.create(CAIXA, {
        ...order50,
        paymentParts: parts,
      });
      expect(created.paymentParts).toHaveLength(2);

      const updated = await service.replace(CAIXA, created.id, {
        ...order50,
        paymentMethodId: 1,
      });
      expect(updated.paymentMethodId).toBe(1);
      expect(updated.paymentParts).toEqual([]);
    });
  });
});
