import {
  ConflictException,
  Inject,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { SessionUser } from '../auth/session-user.js';
import {
  CLOSING_LOOKUP,
  type ClosingLookup,
} from '../closing/closing-lookup.js';
import { findUncanceledOrder } from './editable-order.js';
import { snapshotOf, type OrderEventInput } from './order-events.js';
import { withFiado, type WithFiado } from './order-fiado.js';
import {
  parseOpenAccountPayment,
  type OpenAccountPayment,
} from './order-payment-input.js';
import { assertChangeFor, resolvePaymentMethod } from './order-payment.js';
import {
  ORDER_CATALOG,
  ORDER_REPOSITORY,
  type OrderCatalog,
  type OrderRecord,
  type OrderRepository,
} from './order-repository.js';

/** A pagar = conta aberta do balcão: tem tipo COUNTER e ainda não tem forma. */
function assertOpenAccount(order: OrderRecord): void {
  if (order.type === 'COUNTER' && order.paymentMethodId === null) return;
  throw new ConflictException(
    `Pedido #${order.dayNumber} não está A pagar (tipo ${String(order.type)}, forma ${String(order.paymentMethodId)}): esperado balcão sem forma de pagamento`,
  );
}

/** A gravação condicional não achou o A pagar: outro clique ou outra tela recebeu antes. */
function alreadyReceived(order: OrderRecord): never {
  throw new ConflictException(
    `Pedido #${order.dayNumber} já foi recebido ou cancelado por outra tela: esperado o pedido ainda A pagar (atualize a lista)`,
  );
}

/** O histórico mostra a troca da forma como uma edição (antes sem forma, depois com). */
function paymentEvent(
  user: SessionUser,
  order: OrderRecord,
  payment: OpenAccountPayment,
): OrderEventInput {
  const { paymentMethodId, paymentMode } = payment;
  return {
    userId: user.id,
    managerAuthorized: false,
    details: {
      kind: 'EDITED',
      before: snapshotOf(order),
      after: snapshotOf({ ...order, paymentMethodId, paymentMode }),
    },
  };
}

/**
 * Receber o A pagar direto da lista (card 8, 2026-11-08): só dá a forma, sem abrir o Editar.
 * Não pede a senha (dar forma ao A pagar já era livre), não mexe no estoque nem no status, e
 * não vira fiado (o fiado pede o cliente: é pelo Editar).
 */
@Injectable()
export class OrderPaymentService {
  constructor(
    @Inject(ORDER_REPOSITORY) private readonly orders: OrderRepository,
    @Inject(ORDER_CATALOG) private readonly catalog: OrderCatalog,
    @Inject(CLOSING_LOOKUP) private readonly closings: ClosingLookup,
  ) {}

  /** @example await payments.receive(caixa, 7, { paymentMethodId: 1, changeFor: '50.00' }) */
  async receive(
    user: SessionUser,
    id: number,
    body: unknown,
  ): Promise<WithFiado<OrderRecord>> {
    const payment = parseOpenAccountPayment(body);
    const { order } = await findUncanceledOrder(
      this.orders,
      this.closings,
      user,
      id,
    );
    assertOpenAccount(order);
    await this.assertPayment(payment, order);
    const event = paymentEvent(user, order, payment);
    const saved =
      (await this.orders.receivePayment(id, payment, event)) ??
      alreadyReceived(order);
    const [attached] = await withFiado(this.orders, [saved]);
    return attached;
  }

  /** A forma ativa com o meio certo, nunca fiado, e o troco só no dinheiro e acima do total. */
  private async assertPayment(
    payment: OpenAccountPayment,
    order: OrderRecord,
  ): Promise<void> {
    const method = await resolvePaymentMethod(this.catalog, payment);
    if (method?.isFiado)
      throw new UnprocessableEntityException(
        `Forma de pagamento ${payment.paymentMethodId} é fiado: esperado outra forma (virar fiado é pelo Editar, que pede o cliente)`,
      );
    assertChangeFor(payment.changeFor, method, order.amount);
  }
}
