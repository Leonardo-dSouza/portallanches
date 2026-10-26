import { FakeManagerAuthorizer } from '../auth/auth-fakes.fixture.js';
import { formatCents, toCents } from '../common/money.js';
import type { OrderEventInput } from '../orders/order-events.js';
import { CashierLockGuard } from '../orders/cashier-lock.guard.js';
import {
  FakeClosingLookup,
  FakeOrderCatalog,
} from '../orders/order-fakes.fixture.js';
import { FixedSettings } from '../settings/settings-fakes.fixture.js';
import { paymentSnapshot } from './fiado-events.js';
import { FiadoPaymentService } from './fiado-payment.service.js';
import { FiadoQueryService } from './fiado-query.service.js';
import type {
  FiadoCustomerRecord,
  FiadoOrderFilter,
  FiadoOrderRecord,
  FiadoPaymentCancel,
  FiadoPaymentRecord,
  FiadoRepository,
  NewFiadoPayment,
} from './fiado-repository.js';

// Apoio dos specs do fiado: os fechamentos, as formas e a trava são os fakes do pedido.

/** Instante dos recebimentos nos fakes (20h de 22/09 em Brasília, a noite em andamento). */
export const PAID_AT = new Date('2026-09-22T23:00:00Z');

/** Pedido fiado sem o recebido: o fake soma os recebimentos não estornados. */
type StoredFiadoOrder = Omit<FiadoOrderRecord, 'paid'>;

/** #5 de 20/09 da Maria (cliente 7), R$ 47,00, sem previsão. */
export const MARIA_ORDER: StoredFiadoOrder = {
  orderId: 1,
  businessDate: '2026-09-20',
  dayNumber: 5,
  type: 'COUNTER',
  amount: '47.00',
  canceled: false,
  dueDate: null,
  customerId: 7,
  customerName: 'Maria',
  customerPhone: '79988881111',
};

/** Fechamento 10 = a noite de hoje do `FakeClosingLookup`; os outros, uma noite antiga. */
const dateOfClosing = (closingId: number): string =>
  closingId === 10 ? '2026-09-22' : '2026-08-01';

/** Grava em memória e guarda cada passo do histórico, com o pedido, na ordem. */
export class FakeFiadoRepository implements FiadoRepository {
  orders: StoredFiadoOrder[] = [{ ...MARIA_ORDER }];
  customers: FiadoCustomerRecord[] = [
    { id: 7, name: 'Maria', phone: '79988881111' },
  ];
  payments: FiadoPaymentRecord[] = [];
  readonly events: (OrderEventInput & { orderId: number })[] = [];
  /** O instante que o próximo recebimento ganha (o banco usa o `now()`). */
  createdAt = PAID_AT;

  async listOrders(filter: FiadoOrderFilter): Promise<FiadoOrderRecord[]> {
    return this.orders
      .filter((o) => !o.canceled)
      .filter((o) => !filter.customerId || o.customerId === filter.customerId)
      .filter((o) => !filter.dueBy || (o.dueDate ?? '9999') <= filter.dueBy)
      .map((o) => this.withPaid(o));
  }

  async findOrder(orderId: number): Promise<FiadoOrderRecord | null> {
    const found = this.orders.find((o) => o.orderId === orderId);
    return found ? this.withPaid(found) : null;
  }

  async findCustomer(id: number): Promise<FiadoCustomerRecord | null> {
    return this.customers.find((c) => c.id === id) ?? null;
  }

  async listPayments(customerId: number): Promise<FiadoPaymentRecord[]> {
    const own = this.orders
      .filter((o) => o.customerId === customerId)
      .map((o) => o.orderId);
    return this.payments
      .filter((p) => own.includes(p.orderId))
      .sort((a, b) => b.id - a.id);
  }

  async findPayment(id: number): Promise<FiadoPaymentRecord | null> {
    return this.payments.find((p) => p.id === id) ?? null;
  }

  async createPayment(data: NewFiadoPayment): Promise<FiadoPaymentRecord> {
    const order = this.orders.find((o) => o.orderId === data.orderId)!;
    const { createdById, ...fields } = data;
    const payment: FiadoPaymentRecord = {
      ...fields,
      id: this.payments.length + 1,
      orderDayNumber: order.dayNumber,
      orderBusinessDate: order.businessDate,
      businessDate: dateOfClosing(data.closingId),
      createdAt: this.createdAt,
      canceledAt: null,
      cancelReason: null,
    };
    this.payments.push(payment);
    this.events.push({
      orderId: data.orderId,
      userId: createdById,
      managerAuthorized: false,
      details: { kind: 'FIADO_PAYMENT', payment: paymentSnapshot(payment) },
    });
    return payment;
  }

  async cancelPayment(
    id: number,
    { at, reason }: FiadoPaymentCancel,
    event: OrderEventInput,
  ): Promise<FiadoPaymentRecord | null> {
    const payment = this.payments.find((p) => p.id === id);
    if (!payment || payment.canceledAt) return null;
    Object.assign(payment, { canceledAt: at, cancelReason: reason });
    this.events.push({ ...event, orderId: payment.orderId });
    return payment;
  }

  async setDueDate(
    orderId: number,
    dueDate: string | null,
    event: OrderEventInput,
  ): Promise<void> {
    const order = this.orders.find((o) => o.orderId === orderId)!;
    order.dueDate = dueDate;
    this.events.push({ ...event, orderId });
  }

  private withPaid(order: StoredFiadoOrder): FiadoOrderRecord {
    const cents = this.payments
      .filter((p) => p.orderId === order.orderId && !p.canceledAt)
      .reduce((sum, p) => sum + toCents(p.amount), 0);
    return { ...order, paid: formatCents(cents) };
  }
}

/** 20h de 22/09 em Brasília: a noite em andamento é a de 2026-09-22 (fechamento 10). */
export function buildFiado(now: Date = PAID_AT) {
  const fiado = new FakeFiadoRepository();
  const closings = new FakeClosingLookup();
  const catalog = new FakeOrderCatalog();
  const settings = new FixedSettings();
  const manager = new FakeManagerAuthorizer();
  const clock = () => now;
  const lock = new CashierLockGuard(settings, manager, clock);
  return {
    payments: new FiadoPaymentService(fiado, catalog, closings, lock, clock),
    queries: new FiadoQueryService(fiado, closings),
    fiado,
    closings,
    manager,
  };
}
