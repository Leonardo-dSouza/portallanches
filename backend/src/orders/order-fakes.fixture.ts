import type { SessionUser } from '../auth/session-user.js';
import type { OrderEventInput, OrderEventRecord } from './order-events.js';
import type { FiadoLedgerRow } from './order-fiado.js';
import type {
  OrderCancel,
  OrderData,
  OrderRecord,
  OrderRepository,
  SavedOrder,
  StatusChange,
  StockChange,
} from './order-repository.js';
import type { SaleShortfall } from './order-stock.js';
import { FakeManagerAuthorizer } from '../auth/auth-fakes.fixture.js';
import { FixedSettings } from '../settings/settings-fakes.fixture.js';
import { CashierLockGuard } from './cashier-lock.guard.js';
import { OrderCancelService } from './order-cancel.service.js';
import { OrderPaymentService } from './order-payment.service.js';
import { OrderStatusService } from './order-status.service.js';
import { OrderService } from './order.service.js';
import { FakeClosingLookup } from './closing-lookup-fakes.fixture.js';
import { FakeOrderCatalog } from './order-catalog-fakes.fixture.js';

export { FakeClosingLookup } from './closing-lookup-fakes.fixture.js';
export { FakeOrderCatalog } from './order-catalog-fakes.fixture.js';

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
  /** Formas fiado (como `FakeOrderCatalog`: a 4) e o recebido de cada pedido (2026-10-25). */
  readonly fiadoMethodIds = [4];
  readonly fiadoPaid = new Map<number, string>();

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
      paymentParts: data.paymentParts ?? [],
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
    event: OrderEventInput | OrderEventInput[],
  ): Promise<SavedOrder> {
    this.stockChanges.push(stock);
    const events = Array.isArray(event) ? event : [event];
    for (const ev of events) {
      this.events.push({ ...ev, orderId: id });
    }
    const index = this.records.findIndex((r) => r.id === id);
    const previous = this.records[index];
    this.records[index] = {
      ...previous,
      ...data,
      paymentParts: data.paymentParts ?? [],
      statusChangedAt: data.statusChangedAt ?? previous.statusChangedAt,
    };
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

  /** Atômico condicional: retorna null se o pedido já tem forma ou está cancelado. */
  async receivePayment(
    id: number,
    fields: Pick<
      OrderData,
      'paymentMethodId' | 'paymentMode' | 'changeFor' | 'paymentParts'
    >,
    event: OrderEventInput,
  ): Promise<OrderRecord | null> {
    const record = this.records.find((r) => r.id === id);
    if (!record || record.paymentMethodId !== null || record.canceledAt)
      return null;
    this.events.push({ ...event, orderId: id });
    Object.assign(record, {
      paymentMethodId: fields.paymentMethodId,
      paymentMode: fields.paymentMode,
      changeFor: fields.changeFor,
      paymentParts: fields.paymentParts ?? [],
    });
    return record;
  }

  /** Como o Prisma: os fiados pedidos e os outros fiados em aberto dos mesmos clientes. */
  async listFiadoLedger(orderIds: number[]): Promise<FiadoLedgerRow[]> {
    const fiado = this.records.filter((r) =>
      this.fiadoMethodIds.includes(r.paymentMethodId ?? 0),
    );
    const targets = fiado.filter((r) => orderIds.includes(r.id));
    const customers = targets.map((r) => r.customerId);
    const others = fiado.filter(
      (r) =>
        !orderIds.includes(r.id) &&
        !r.canceledAt &&
        customers.includes(r.customerId),
    );
    return [...targets, ...others].map((r) => this.ledgerRow(r));
  }

  private ledgerRow(record: OrderRecord): FiadoLedgerRow {
    return {
      orderId: record.id,
      customerId: record.customerId,
      amount: record.amount,
      paid: this.fiadoPaid.get(record.id) ?? '0.00',
      canceled: record.canceledAt !== null,
    };
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

export function build(now: Date | (() => Date) = EVENING) {
  const orders = new FakeOrderRepository();
  const closings = new FakeClosingLookup();
  const catalog = new FakeOrderCatalog();
  const settings = new FixedSettings();
  const manager = new FakeManagerAuthorizer();
  const clock = typeof now === 'function' ? now : () => now;
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
    payments: new OrderPaymentService(orders, catalog, closings),
    orders,
    closings,
    catalog,
    settings,
    manager,
  };
}
