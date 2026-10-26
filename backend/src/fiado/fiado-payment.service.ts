import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { SessionUser } from '../auth/session-user.js';
import {
  CLOSING_LOOKUP,
  type ClosingLookup,
} from '../closing/closing-lookup.js';
import { CLOCK, type Clock } from '../common/clock.js';
import { formatCents, toCents } from '../common/money.js';
import { CashierLockGuard } from '../orders/cashier-lock.guard.js';
import type { OrderEventInput } from '../orders/order-events.js';
import { parseCancelReason } from '../orders/order-cancel.service.js';
import { remainingCents } from '../orders/order-fiado.js';
import {
  assertDueNotBefore,
  resolvePaymentMethod,
} from '../orders/order-payment.js';
import {
  ORDER_CATALOG,
  type OrderCatalog,
  type PaymentMethodEntry,
} from '../orders/order-repository.js';
import { paymentSnapshot } from './fiado-events.js';
import {
  parseFiadoDueDateInput,
  parseFiadoPaymentInput,
  type FiadoPaymentInput,
} from './fiado-input.js';
import {
  FIADO_REPOSITORY,
  type FiadoOrderRecord,
  type FiadoPaymentRecord,
  type FiadoRepository,
} from './fiado-repository.js';
import { openTotalOf } from './fiado-views.js';

/** O recebimento (ou o estorno) com o que o comprovante precisa: o cliente e o que falta. */
export interface FiadoReceipt {
  payment: FiadoPaymentRecord;
  customerId: number;
  customerName: string;
  /** O que falta no pedido depois deste passo. */
  remaining: string;
  /** Quanto o cliente deve em todos os fiados. */
  customerOpenTotal: string;
}

/**
 * O recebimento abate de R$ 0,01 até o que falta (2026-10-25): não existe crédito nem troco no
 * fiado (o troco do dinheiro é com o caixa, como hoje).
 */
function assertWithinRemaining(order: FiadoOrderRecord, amount: string): void {
  const remaining = remainingCents(order);
  if (remaining === 0)
    throw new ConflictException(
      `Pedido #${order.dayNumber} de ${order.businessDate} já está pago: esperado um fiado com algo a receber`,
    );
  if (toCents(amount) <= remaining) return;
  const max = formatCents(remaining);
  throw new UnprocessableEntityException(
    `Valor ${amount} maior que o que falta no pedido #${order.dayNumber} (${max}): esperado de 0.01 até ${max}`,
  );
}

/**
 * Receber, estornar e remarcar o fiado (2026-10-25). O recebimento entra na gaveta da noite em
 * que foi pago e não mexe no estoque; o estorno usa a trava do cancelar; remarcar não pede senha
 * (não mexe em dinheiro).
 */
@Injectable()
export class FiadoPaymentService {
  constructor(
    @Inject(FIADO_REPOSITORY) private readonly fiado: FiadoRepository,
    @Inject(ORDER_CATALOG) private readonly catalog: OrderCatalog,
    @Inject(CLOSING_LOOKUP) private readonly closings: ClosingLookup,
    @Inject(CashierLockGuard) private readonly lock: CashierLockGuard,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /** @example await payments.receive(user, 12, { amount: 20, extra: 5, paymentMethodId: 1 }) */
  async receive(
    user: SessionUser,
    orderId: number,
    body: unknown,
  ): Promise<FiadoReceipt> {
    const input = parseFiadoPaymentInput(body);
    const order = await this.findActiveOrder(orderId);
    assertWithinRemaining(order, input.amount);
    const method = await this.drawerMethod(input);
    const closing = await this.closings.getOrCreateFor(
      user,
      input.date ?? undefined,
    );
    this.closings.assertEditable(user, closing);
    const payment = await this.fiado.createPayment({
      ...paymentFields(input, method),
      orderId,
      closingId: closing.id,
      createdById: user.id,
    });
    return this.receiptFor(payment, order);
  }

  /**
   * Estorno com motivo: só enquanto a noite do recebimento está aberta para quem estorna; fora
   * da trava do caixa, com a senha do admin.
   *
   * @example await payments.cancel(user, 3, { reason: 'Valor errado' })
   */
  async cancel(
    user: SessionUser,
    paymentId: number,
    body: unknown,
  ): Promise<FiadoReceipt> {
    const reason = parseCancelReason(body);
    const payment = await this.findActivePayment(paymentId);
    this.closings.assertEditable(
      user,
      await this.closings.getById(payment.closingId),
    );
    const managerAuthorized = await this.lock.authorize(user, payment, body);
    const canceled = await this.fiado.cancelPayment(
      paymentId,
      { userId: user.id, at: this.clock(), reason },
      cancelEvent(user, payment, reason, managerAuthorized),
    );
    if (!canceled) throw alreadyCanceled(payment);
    return this.receiptFor(canceled, await this.findOrder(payment.orderId));
  }

  /** @example await payments.reschedule(user, 12, { dueDate: '2026-10-30' }) // { orderId: 12, dueDate: '2026-10-30' } */
  async reschedule(
    user: SessionUser,
    orderId: number,
    body: unknown,
  ): Promise<{ orderId: number; dueDate: string | null }> {
    const dueDate = parseFiadoDueDateInput(body);
    const order = await this.findActiveOrder(orderId);
    assertDueNotBefore(dueDate, order.businessDate);
    await this.fiado.setDueDate(orderId, dueDate, {
      userId: user.id,
      managerAuthorized: false,
      details: { kind: 'FIADO_DUE_DATE', from: order.dueDate, to: dueDate },
    });
    return { orderId, dueDate };
  }

  private async findOrder(orderId: number): Promise<FiadoOrderRecord> {
    const order = await this.fiado.findOrder(orderId);
    if (order) return order;
    throw new NotFoundException(
      `Pedido fiado ${orderId} não encontrado: esperado um pedido com a forma fiado`,
    );
  }

  private async findActiveOrder(orderId: number): Promise<FiadoOrderRecord> {
    const order = await this.findOrder(orderId);
    if (!order.canceled) return order;
    throw new ConflictException(
      `Pedido #${order.dayNumber} de ${order.businessDate} está cancelado: esperado um fiado ativo`,
    );
  }

  private async findActivePayment(id: number): Promise<FiadoPaymentRecord> {
    const payment = await this.fiado.findPayment(id);
    if (!payment)
      throw new NotFoundException(`Recebimento de fiado ${id} não encontrado`);
    if (payment.canceledAt) throw alreadyCanceled(payment);
    return payment;
  }

  /** A forma que entra na gaveta: ativa, com o meio na maquininha, e nunca a própria fiado. */
  private async drawerMethod(
    input: FiadoPaymentInput,
  ): Promise<PaymentMethodEntry> {
    const method = await resolvePaymentMethod(this.catalog, input);
    if (method && !method.isFiado) return method;
    throw new BadRequestException(
      `Forma de pagamento ${input.paymentMethodId} é fiado: esperado uma forma que entra na gaveta (dinheiro, PIX, maquininha)`,
    );
  }

  /** O que falta no pedido e o total do cliente depois do passo, para o comprovante. */
  private async receiptFor(
    payment: FiadoPaymentRecord,
    order: FiadoOrderRecord,
  ): Promise<FiadoReceipt> {
    const orders = await this.fiado.listOrders({
      customerId: order.customerId,
    });
    const own = orders.find((o) => o.orderId === order.orderId);
    return {
      payment,
      customerId: order.customerId,
      customerName: order.customerName,
      remaining: formatCents(own ? remainingCents(own) : 0),
      customerOpenTotal: openTotalOf(orders),
    };
  }
}

/** Os valores e a forma do recebimento, já conferidos. */
function paymentFields(input: FiadoPaymentInput, method: PaymentMethodEntry) {
  const { amount, extra, paymentMode } = input;
  return { amount, extra, paymentMode, paymentMethodId: method.id };
}

/** O passo do histórico do pedido no estorno: o recebimento, o motivo e se a senha liberou. */
function cancelEvent(
  user: SessionUser,
  payment: FiadoPaymentRecord,
  reason: string,
  managerAuthorized: boolean,
): OrderEventInput {
  return {
    userId: user.id,
    managerAuthorized,
    details: {
      kind: 'FIADO_PAYMENT_CANCELED',
      payment: paymentSnapshot(payment),
      reason,
    },
  };
}

function alreadyCanceled(payment: FiadoPaymentRecord): ConflictException {
  return new ConflictException(
    `Recebimento de fiado ${payment.id} (${payment.amount}) já foi estornado: esperado um recebimento ativo`,
  );
}
