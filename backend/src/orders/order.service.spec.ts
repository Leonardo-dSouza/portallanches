import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import type { SessionUser } from '../auth/session-user.js';
import { assertCanEditClosing } from '../closing/closing-access.js';
import type { ClosingRecord } from '../closing/closing-repository.js';
import type { ClosingLookup } from '../closing/closing-lookup.js';
import type {
  PaymentMethodEntry,
  CustomerEntry,
  DeliveryZoneEntry,
  OrderCatalog,
  OrderData,
  OrderRecord,
  OrderRepository,
} from './order-repository.js';
import type { SaleProduct } from './order-pricing.js';
import { OrderService } from './order.service.js';

const CAIXA: SessionUser = { id: 2, name: 'caixa', role: 'CAIXA' };
const ADMIN: SessionUser = { id: 1, name: 'admin', role: 'ADMIN' };

class FakeOrderRepository implements OrderRepository {
  readonly records: OrderRecord[] = [];

  async create(
    closingId: number,
    createdById: number,
    data: OrderData,
  ): Promise<OrderRecord> {
    const record = {
      id: this.records.length + 1,
      closingId,
      createdById,
      ...data,
    };
    this.records.push(record);
    return record;
  }

  async findById(id: number): Promise<OrderRecord | null> {
    return this.records.find((r) => r.id === id) ?? null;
  }

  async update(id: number, data: OrderData): Promise<OrderRecord> {
    const index = this.records.findIndex((r) => r.id === id);
    this.records[index] = { ...this.records[index], ...data };
    return this.records[index];
  }

  async delete(id: number): Promise<void> {
    this.records.splice(
      this.records.findIndex((r) => r.id === id),
      1,
    );
  }

  async listByClosing(closingId: number): Promise<OrderRecord[]> {
    return this.records.filter((r) => r.closingId === closingId);
  }
}

class FakeOrderCatalog implements OrderCatalog {
  /** 1 ativa, 3 maquininha ativa, 9 inativa. */
  async findPaymentMethod(id: number): Promise<PaymentMethodEntry | null> {
    if (id === 1) return { id, active: true, isCardTerminal: false };
    if (id === 3) return { id, active: true, isCardTerminal: true };
    return id === 9 ? { id, active: false, isCardTerminal: false } : null;
  }

  /** Bairro 3 ativo (taxa 3,00), 4 inativo. */
  async findDeliveryZone(id: number): Promise<DeliveryZoneEntry | null> {
    if (id === 3) return { id, active: true, fee: '3.00' };
    return id === 4 ? { id, active: false, fee: '2.00' } : null;
  }

  customers: CustomerEntry[] = [
    {
      id: 5,
      name: 'Ana',
      phone: '79999991234',
      street: 'Rua A',
      deliveryZoneId: 3,
    },
    { id: 6, name: 'Bia', phone: null, street: 'Rua C', deliveryZoneId: 4 },
  ];

  async findCustomer(id: number): Promise<CustomerEntry | null> {
    return this.customers.find((c) => c.id === id) ?? null;
  }

  /** X Salada (9) a R$ 17,80 e Coca 600 (60) a R$ 7,00; o preço muda no meio de alguns testes. */
  products: SaleProduct[] = [
    {
      id: 9,
      name: 'X Salada',
      menuNumber: 9,
      categoryName: 'Tradicional',
      salePrice: '17.80',
      active: true,
      components: [{ quantity: '1', unitCost: '2.44' }],
    },
    {
      id: 60,
      name: 'Coca Cola 600ml',
      menuNumber: null,
      categoryName: 'Refrigerantes',
      salePrice: '7.00',
      active: true,
      components: [],
    },
  ];

  async findProductsForSale(ids: number[]): Promise<SaleProduct[]> {
    return this.products.filter((p) => ids.includes(p.id));
  }
}

class FakeClosingLookup implements ClosingLookup {
  today: ClosingRecord = {
    id: 10,
    businessDate: '2026-09-22',
    status: 'OPEN',
    motoboyDailyRate: '40.00',
    closedById: null,
    closedAt: null,
    reopenedById: null,
    reopenedAt: null,
    notes: null,
  };

  askedDates: (string | undefined)[] = [];

  async getFor(_user: SessionUser, rawDate?: string): Promise<ClosingRecord> {
    this.askedDates.push(rawDate);
    return this.today;
  }

  async getOrCreateFor(
    _user: SessionUser,
    rawDate?: string,
  ): Promise<ClosingRecord> {
    this.askedDates.push(rawDate);
    return this.today;
  }

  /** Id diferente do de hoje = fechamento antigo, fora da janela do caixa. */
  async getById(id: number): Promise<ClosingRecord> {
    if (id === this.today.id) return this.today;
    return { ...this.today, id, businessDate: '2026-08-01' };
  }

  assertEditable(user: SessionUser, closing: ClosingRecord): void {
    assertCanEditClosing(user, closing, '2026-09-22');
  }

  async getByDate(): Promise<ClosingRecord> {
    return this.today;
  }
}

const TWO_X_SALADA = [{ productId: 9, quantity: 2 }];
const COUNTER = { items: TWO_X_SALADA, type: 'COUNTER', paymentMethodId: 1 };
const DELIVERY = {
  items: TWO_X_SALADA,
  type: 'DELIVERY',
  paymentMethodId: 1,
  customerId: 5,
};

function build() {
  const orders = new FakeOrderRepository();
  const closings = new FakeClosingLookup();
  const catalog = new FakeOrderCatalog();
  return {
    service: new OrderService(orders, catalog, closings),
    orders,
    closings,
    catalog,
  };
}

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
    expect(order).toMatchObject({ customerId: null, customerName: null });
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
    const old = await orders.create(5, 1, {
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
    } as OrderData);
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
