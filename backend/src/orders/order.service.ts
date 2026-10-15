import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import type { SessionUser } from '../auth/session-user.js';
import {
  CLOSING_LOOKUP,
  type ClosingLookup,
} from '../closing/closing-lookup.js';
import type { ClosingRecord } from '../closing/closing-repository.js';
import { BUSINESS_TIMEZONE, CLOCK, type Clock } from '../common/clock.js';
import { CashierLockGuard } from './cashier-lock.guard.js';
import { findUncanceledOrder } from './editable-order.js';
import { isSensitiveEdit } from './order-lock.js';
import { snapshotOf, type OrderEventInput } from './order-events.js';
import { parseOrderInput, type OrderInput } from './order-input.js';
import { assertChangeFor, resolvePaymentMethod } from './order-payment.js';
import { assertAddonsAllowed } from './order-addons.js';
import { productIdsOf } from './order-item-input.js';
import { flattenEntries } from './order-item-tree.js';
import {
  orderAmount,
  priceOrderEntries,
  type OrderEntry,
} from './order-pricing.js';
import { sortItemsByCategory } from './item-order.js';
import {
  ORDER_CATALOG,
  ORDER_REPOSITORY,
  type CustomerEntry,
  type DeliveryZoneEntry,
  type OrderCatalog,
  type OrderData,
  type OrderRecord,
  type OrderRepository,
  type OrderSaveResponse,
} from './order-repository.js';
import { isLiveNight } from '../closing/live-night.js';
import {
  initialStatus,
  statusForType,
  type OrderStatus,
} from './order-status.js';
import { saleNeeds, stockChangeFor, type SaleNeed } from './stock-needs.js';

const COUNTER_DELIVERY = {
  deliveryZoneId: null,
  deliveryFee: '0.00',
  customerId: null,
  customerName: null,
  customerPhone: null,
  customerStreet: null,
  customerNumber: null,
  customerReference: null,
} as const;

/** O que montar o pedido precisa além do corpo: o dia, o status e as linhas da época. */
interface ResolveContext {
  businessDate: string;
  status: OrderStatus;
  previous?: OrderEntry[];
}

@Injectable()
export class OrderService {
  constructor(
    @Inject(ORDER_REPOSITORY) private readonly orders: OrderRepository,
    @Inject(ORDER_CATALOG) private readonly catalog: OrderCatalog,
    @Inject(CLOSING_LOOKUP) private readonly closings: ClosingLookup,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(BUSINESS_TIMEZONE) private readonly timeZone: string,
    @Inject(CashierLockGuard) private readonly lock: CashierLockGuard,
  ) {}

  /**
   * Lança um pedido no fechamento da data escolhida (padrão: hoje). Balcão grava taxa 0; entrega
   * exige cliente e copia a taxa do bairro dele, salvo sobrescrita informada.
   *
   * @example await service.create(user, { amount: 30, type: 'COUNTER', paymentMethodId: 1 });
   */
  async create(
    user: SessionUser,
    body: unknown,
    rawDate?: string,
  ): Promise<OrderSaveResponse> {
    const input = parseOrderInput(body);
    const closing = await this.closings.getOrCreateFor(user, rawDate);
    this.closings.assertEditable(user, closing);
    const live = this.isLive(closing.businessDate);
    const { data, needs } = await this.resolveOrderData(input, {
      businessDate: closing.businessDate,
      status: initialStatus(live),
    });
    const stock = stockChangeFor(live, user.id, needs);
    const event: OrderEventInput = {
      userId: user.id,
      managerAuthorized: false,
      details: { kind: 'CREATED', order: snapshotOf(data) },
    };
    const saved = await this.orders.create(
      closing.id,
      user.id,
      data,
      stock,
      event,
    );
    return { ...saved, live };
  }

  /**
   * Editar mantém o status (o que não existe no tipo novo volta para Em preparo). Baixar o
   * valor ou trocar a forma fora da trava do caixa pede a senha do admin (2026-10-15).
   */
  async replace(
    user: SessionUser,
    id: number,
    body: unknown,
  ): Promise<OrderSaveResponse> {
    const input = parseOrderInput(body);
    const { order, closing } = await this.findEditable(user, id);
    const live = this.isLive(closing.businessDate);
    const resolved = await this.resolveOrderData(input, {
      businessDate: closing.businessDate,
      status: statusForType(input.type, order.status),
      previous: order.items,
    });
    const managerAuthorized = isSensitiveEdit(order, resolved.data)
      ? await this.lock.authorize(user, order, body)
      : false;
    const stock = stockChangeFor(live, user.id, resolved.needs);
    const event: OrderEventInput = {
      userId: user.id,
      managerAuthorized,
      details: {
        kind: 'EDITED',
        before: snapshotOf(order),
        after: snapshotOf(resolved.data),
      },
    };
    const saved = await this.orders.update(
      order.id,
      resolved.data,
      stock,
      event,
    );
    return { ...saved, live };
  }

  /** Noite em andamento (hoje, ou ontem de madrugada): ver `isLiveNight`. */
  private isLive(businessDate: string): boolean {
    return isLiveNight(businessDate, this.clock(), this.timeZone);
  }

  async listFor(user: SessionUser, rawDate?: string): Promise<OrderRecord[]> {
    const closing = await this.closings.getFor(user, rawDate);
    return this.orders.listByClosing(closing.id);
  }

  async listByDate(rawDate: string): Promise<OrderRecord[]> {
    const closing = await this.closings.getByDate(rawDate);
    return this.orders.listByClosing(closing.id);
  }

  /** O pedido e o fechamento dele: o dia do fechamento dá o preço das linhas novas. */
  private findEditable(
    user: SessionUser,
    id: number,
  ): Promise<{ order: OrderRecord; closing: ClosingRecord }> {
    return findUncanceledOrder(this.orders, this.closings, user, id);
  }

  /**
   * `businessDate` = dia do fechamento do pedido (preço da época para as linhas novas);
   * `previous` = linhas do pedido em edição, que mantêm o preço gravado.
   */
  private async resolveOrderData(
    input: OrderInput,
    context: ResolveContext,
  ): Promise<{ data: OrderData; needs: SaleNeed[] }> {
    const method = await resolvePaymentMethod(this.catalog, input);
    const delivery = await this.resolveDelivery(input);
    const { items, needs } = await this.priceItems(
      input,
      context.businessDate,
      context.previous ?? [],
    );
    const amount = orderAmount(flattenEntries(items), delivery.deliveryFee);
    assertChangeFor(input.changeFor, method, amount);
    const { type, paymentMethodId, paymentMode, changeFor } = input;
    const { status } = context;
    const data = { amount, items, type, paymentMethodId, paymentMode, status };
    return { data: { ...data, changeFor, ...delivery }, needs };
  }

  /** Linhas com o preço do dia e o que elas tiram do estoque (pela composição de hoje). */
  private async priceItems(
    input: OrderInput,
    businessDate: string,
    previous: OrderEntry[],
  ): Promise<{ items: OrderEntry[]; needs: SaleNeed[] }> {
    const ids = productIdsOf(input.items);
    const products = await this.catalog.findProductsForSale(ids, businessDate);
    const byId = new Map(products.map((p) => [p.id, p]));
    assertAddonsAllowed(input.items, byId, previous);
    const sorted = sortItemsByCategory(input.items, byId);
    const items = priceOrderEntries(sorted, byId, previous);
    return { items, needs: saleNeeds(flattenEntries(items), byId) };
  }

  /**
   * Balcão: sem cliente, sem bairro e taxa 0; o nome digitado (conta aberta ou "pelo nome")
   * vai em `customerName`. Entrega: bairro do cadastro do cliente, taxa do bairro salvo
   * sobrescrita, e cópia de nome/telefone/rua/número/referência naquele momento.
   */
  private async resolveDelivery(
    input: OrderInput,
  ): Promise<
    Omit<
      OrderData,
      | 'amount'
      | 'items'
      | 'type'
      | 'paymentMethodId'
      | 'paymentMode'
      | 'status'
      | 'changeFor'
    >
  > {
    if (input.customerId === null)
      return { ...COUNTER_DELIVERY, customerName: input.counterName };
    const customer = await this.findCustomer(input.customerId);
    const zone = await this.findActiveZone(customer.deliveryZoneId);
    return {
      deliveryZoneId: zone.id,
      deliveryFee: input.deliveryFee ?? zone.fee,
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phone,
      customerStreet: customer.street,
      customerNumber: customer.number,
      customerReference: customer.reference,
    };
  }

  private async findCustomer(id: number): Promise<CustomerEntry> {
    const customer = await this.catalog.findCustomer(id);
    if (customer) return customer;
    throw new BadRequestException(
      `Cliente ${id} inexistente: esperado id de um cliente em customers`,
    );
  }

  private async findActiveZone(id: number): Promise<DeliveryZoneEntry> {
    const zone = await this.catalog.findDeliveryZone(id);
    if (zone?.active) return zone;
    throw new BadRequestException(
      `Bairro ${id} do cliente inexistente ou inativo: esperado bairro ativo em delivery_zones`,
    );
  }
}
