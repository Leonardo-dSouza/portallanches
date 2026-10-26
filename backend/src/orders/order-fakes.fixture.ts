import type { SessionUser } from '../auth/session-user.js';
import {
  assertCanEditClosing,
  assertCanSelectDate,
} from '../closing/closing-access.js';
import type { ClosingRecord } from '../closing/closing-repository.js';
import type { ClosingLookup } from '../closing/closing-lookup.js';
import type { OrderEventInput, OrderEventRecord } from './order-events.js';
import type {
  PaymentMethodEntry,
  CustomerEntry,
  DeliveryZoneEntry,
  OrderCancel,
  OrderCatalog,
  OrderData,
  OrderRecord,
  OrderRepository,
  SavedOrder,
  StatusChange,
  StockChange,
} from './order-repository.js';
import type { SaleShortfall } from './order-stock.js';
import type { SaleProduct } from './order-pricing.js';
import { FakeManagerAuthorizer } from '../auth/auth-fakes.fixture.js';
import { FixedSettings } from '../settings/settings-fakes.fixture.js';
import { CashierLockGuard } from './cashier-lock.guard.js';
import { OrderCancelService } from './order-cancel.service.js';
import { OrderStatusService } from './order-status.service.js';
import { OrderService } from './order.service.js';

// Apoio dos specs do OrderService (pedidos e baixa no estoque), separados por tamanho.

export const CAIXA: SessionUser = { id: 2, name: 'caixa', role: 'CAIXA' };
export const ADMIN: SessionUser = { id: 1, name: 'admin', role: 'ADMIN' };

/** Instante fixo do lançamento nos fakes (20h de 22/09 em Brasília). */
export const LAUNCHED_AT = new Date('2026-09-22T23:00:00Z');

export class FakeOrderRepository implements OrderRepository {
  readonly records: OrderRecord[] = [];
  /** O que cada gravação mandou para o estoque (null = não mexe). */
  readonly stockChanges: (StockChange | null)[] = [];
  /** O histórico gravado, na ordem, com o pedido de cada passo. */
  readonly events: (OrderEventInput & { orderId: number })[] = [];
  /** O que o estoque responde quando a gravação mexe nele (venda além do saldo). */
  shortfalls: SaleShortfall[] = [];

  private shortfallsFor(stock: StockChange | null): SaleShortfall[] {
    return stock ? this.shortfalls : [];
  }

  async create(
    closingId: number,
    createdById: number,
    data: OrderData,
    stock: StockChange | null,
    event: OrderEventInput,
  ): Promise<SavedOrder> {
    this.stockChanges.push(stock);
    const record: OrderRecord = {
      id: this.records.length + 1,
      closingId,
      dayNumber: this.nextDayNumber(closingId),
      createdById,
      createdAt: LAUNCHED_AT,
      statusChangedAt: LAUNCHED_AT,
      canceledAt: null,
      cancelReason: null,
      ...data,
    };
    this.records.push(record);
    this.events.push({ ...event, orderId: record.id });
    return { ...record, stockShortfalls: this.shortfallsFor(stock) };
  }

  /** Último número dado em cada fechamento: como o contador do Prisma, só cresce. */
  private readonly lastNumbers = new Map<number, number>();

  private nextDayNumber(closingId: number): number {
    const next = (this.lastNumbers.get(closingId) ?? 0) + 1;
    this.lastNumbers.set(closingId, next);
    return next;
  }

  async findById(id: number): Promise<OrderRecord | null> {
    return this.records.find((r) => r.id === id) ?? null;
  }

  async updateStatus(
    id: number,
    { from, to, at }: StatusChange,
    event: OrderEventInput,
  ): Promise<OrderRecord | null> {
    const record = this.records.find((r) => r.id === id)!;
    if (record.status !== from || record.canceledAt) return null;
    this.events.push({ ...event, orderId: id });
    return Object.assign(record, { status: to, statusChangedAt: at });
  }

  async update(
    id: number,
    data: OrderData,
    stock: StockChange | null,
    event: OrderEventInput,
  ): Promise<SavedOrder> {
    this.stockChanges.push(stock);
    this.events.push({ ...event, orderId: id });
    const index = this.records.findIndex((r) => r.id === id);
    this.records[index] = { ...this.records[index], ...data };
    return {
      ...this.records[index],
      stockShortfalls: this.shortfallsFor(stock),
    };
  }

  async cancel(
    id: number,
    { reason, at }: OrderCancel,
    stock: StockChange | null,
    event: OrderEventInput,
  ): Promise<OrderRecord> {
    return this.change(
      id,
      { canceledAt: at, cancelReason: reason },
      stock,
      event,
    );
  }

  async restore(
    id: number,
    stock: StockChange | null,
    event: OrderEventInput,
  ): Promise<OrderRecord> {
    return this.change(
      id,
      { canceledAt: null, cancelReason: null },
      stock,
      event,
    );
  }

  async listEvents(orderId: number): Promise<OrderEventRecord[]> {
    return this.events
      .filter((event) => event.orderId === orderId)
      .map((event, index) => ({
        id: index + 1,
        at: LAUNCHED_AT,
        userRole: event.userId === ADMIN.id ? 'ADMIN' : 'CAIXA',
        managerAuthorized: event.managerAuthorized,
        details: event.details,
      }));
  }

  private change(
    id: number,
    fields: Partial<OrderRecord>,
    stock: StockChange | null,
    event: OrderEventInput,
  ): OrderRecord {
    this.stockChanges.push(stock);
    this.events.push({ ...event, orderId: id });
    const record = this.records.find((r) => r.id === id)!;
    Object.assign(record, fields);
    return record;
  }

  async listByClosing(closingId: number): Promise<OrderRecord[]> {
    return this.records.filter((r) => r.closingId === closingId);
  }
}

export class FakeOrderCatalog implements OrderCatalog {
  /** 1 ativa, 2 dinheiro, 3 maquininha ativa, 9 inativa. */
  async findPaymentMethod(id: number): Promise<PaymentMethodEntry | null> {
    const plain = { id, active: true, isCardTerminal: false, isCash: false };
    if (id === 1) return plain;
    if (id === 2) return { ...plain, isCash: true };
    if (id === 3) return { ...plain, isCardTerminal: true };
    return id === 9 ? { ...plain, active: false } : null;
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
      number: '123',
      reference: 'casa azul',
      deliveryZoneId: 3,
    },
    {
      id: 6,
      name: 'Bia',
      phone: null,
      street: 'Rua C',
      number: 'S/N',
      reference: null,
      deliveryZoneId: 4,
    },
    // Cliente do balcão (fiado, 2026-10-25): só nome e telefone.
    {
      id: 7,
      name: 'Maria',
      phone: '79988881111',
      street: null,
      number: null,
      reference: null,
      deliveryZoneId: null,
    },
  ];

  async findCustomer(id: number): Promise<CustomerEntry | null> {
    return this.customers.find((c) => c.id === id) ?? null;
  }

  /**
   * X Salada (9) a R$ 17,80 (aceita os Adicionais, categoria 3), Coca 600 (60) a R$ 7,00,
   * Guaraná lata (61, com baixa no estoque) e Add bacon (33) a R$ 6,00; o preço muda no meio de
   * alguns testes.
   */
  products: SaleProduct[] = [
    {
      id: 9,
      name: 'X Salada',
      menuNumber: 9,
      categoryId: 1,
      categoryName: 'Tradicional',
      categorySortOrder: 1,
      addonCategoryId: 3,
      isBundle: false,
      salePrice: '17.80',
      active: true,
      components: [
        { supplyId: 7, quantity: '1', unitCost: '2.44', deductOnSale: false },
      ],
    },
    {
      id: 60,
      name: 'Coca Cola 600ml',
      menuNumber: null,
      categoryId: 4,
      categoryName: 'Refrigerantes',
      categorySortOrder: 4,
      addonCategoryId: null,
      isBundle: false,
      salePrice: '7.00',
      active: true,
      components: [],
    },
    {
      id: 61,
      name: 'Guaraná lata',
      menuNumber: null,
      categoryId: 4,
      categoryName: 'Refrigerantes',
      categorySortOrder: 4,
      addonCategoryId: null,
      isBundle: false,
      salePrice: '6.00',
      active: true,
      components: [
        { supplyId: 30, quantity: '1', unitCost: '3.10', deductOnSale: true },
      ],
    },
    {
      id: 33,
      name: 'Add bacon',
      menuNumber: null,
      categoryId: 3,
      categoryName: 'Adicionais',
      categorySortOrder: 3,
      addonCategoryId: null,
      isBundle: false,
      salePrice: '6.00',
      active: true,
      components: [
        { supplyId: 12, quantity: '0.03', unitCost: '50', deductOnSale: false },
      ],
    },
  ];

  /** Dia de negócio de cada consulta: o preço vem do dia do caixa, não de hoje. */
  readonly pricedOn: string[] = [];

  async findProductsForSale(
    ids: number[],
    businessDate: string,
  ): Promise<SaleProduct[]> {
    this.pricedOn.push(businessDate);
    return this.products.filter((p) => ids.includes(p.id));
  }
}

export class FakeClosingLookup implements ClosingLookup {
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

  /** Id diferente do de hoje = fechamento antigo, fora da noite em andamento do caixa. */
  async getById(id: number): Promise<ClosingRecord> {
    if (id === this.today.id) return this.today;
    return { ...this.today, id, businessDate: '2026-08-01' };
  }

  assertEditable(user: SessionUser, closing: ClosingRecord): void {
    assertCanEditClosing(user, closing, ['2026-09-22']);
  }

  assertViewable(user: SessionUser, closing: ClosingRecord): void {
    assertCanSelectDate(user, closing.businessDate, ['2026-09-22']);
  }

  async getByDate(): Promise<ClosingRecord> {
    return this.today;
  }
}

export const TWO_X_SALADA = [{ productId: 9, quantity: 2 }];
export const COUNTER = {
  items: TWO_X_SALADA,
  type: 'COUNTER',
  paymentMethodId: 1,
};
export const DELIVERY = {
  items: TWO_X_SALADA,
  type: 'DELIVERY',
  paymentMethodId: 1,
  customerId: 5,
};

/** 20h de 22/09 em Brasília: o caixa de hoje (2026-09-22) está aberto. */
export const EVENING = new Date('2026-09-22T23:00:00Z');

export function build(now: Date = EVENING) {
  const orders = new FakeOrderRepository();
  const closings = new FakeClosingLookup();
  const catalog = new FakeOrderCatalog();
  const settings = new FixedSettings();
  const manager = new FakeManagerAuthorizer();
  const clock = () => now;
  const lock = new CashierLockGuard(settings, manager, clock);
  return {
    service: new OrderService(
      orders,
      catalog,
      closings,
      clock,
      'America/Sao_Paulo',
      lock,
    ),
    statuses: new OrderStatusService(orders, closings, clock),
    cancels: new OrderCancelService(
      orders,
      catalog,
      closings,
      lock,
      clock,
      'America/Sao_Paulo',
    ),
    orders,
    closings,
    catalog,
    settings,
    manager,
  };
}
