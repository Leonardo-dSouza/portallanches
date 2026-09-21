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
  CatalogEntry,
  DeliveryZoneEntry,
  OrderCatalog,
  OrderData,
  OrderRecord,
  OrderRepository,
} from './order-repository.js';
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
  async findPaymentMethod(id: number): Promise<CatalogEntry | null> {
    if (id === 1) return { id, active: true };
    return id === 9 ? { id, active: false } : null;
  }

  async findDeliveryZone(id: number): Promise<DeliveryZoneEntry | null> {
    return id === 3 ? { id, active: true, fee: '3.00' } : null;
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

const COUNTER = { amount: 30, type: 'COUNTER', paymentMethodId: 1 };
const DELIVERY = {
  amount: 45,
  type: 'DELIVERY',
  paymentMethodId: 1,
  deliveryZoneId: 3,
};

function build() {
  const orders = new FakeOrderRepository();
  const closings = new FakeClosingLookup();
  return {
    service: new OrderService(orders, new FakeOrderCatalog(), closings),
    orders,
    closings,
  };
}

describe('OrderService', () => {
  it('grava balcão com taxa zero no fechamento de hoje', async () => {
    const order = await build().service.create(CAIXA, COUNTER);
    expect(order).toMatchObject({
      closingId: 10,
      deliveryFee: '0.00',
      deliveryZoneId: null,
    });
  });

  it('copia a taxa do bairro na entrega', async () => {
    const order = await build().service.create(CAIXA, DELIVERY);
    expect(order).toMatchObject({ deliveryZoneId: 3, deliveryFee: '3.00' });
  });

  it('respeita a sobrescrita da taxa', async () => {
    const order = await build().service.create(CAIXA, {
      ...DELIVERY,
      deliveryFee: 5,
    });
    expect(order.deliveryFee).toBe('5.00');
  });

  it('rejeita bairro inexistente e forma de pagamento inativa', async () => {
    const { service } = build();
    await expect(
      service.create(CAIXA, { ...DELIVERY, deliveryZoneId: 99 }),
    ).rejects.toThrow(/Bairro 99/);
    await expect(
      service.create(CAIXA, { ...COUNTER, paymentMethodId: 9 }),
    ).rejects.toThrow(BadRequestException);
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
      ...COUNTER,
      amount: '30.00',
      deliveryZoneId: null,
      deliveryFee: '0.00',
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
