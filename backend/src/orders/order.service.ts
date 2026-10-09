import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { SessionUser } from '../auth/session-user.js';
import {
  CLOSING_LOOKUP,
  type ClosingLookup,
} from '../closing/closing-lookup.js';
import type { ClosingRecord } from '../closing/closing-repository.js';
import { parseOrderInput, type OrderInput } from './order-input.js';
import {
  orderAmount,
  priceOrderLines,
  type OrderLine,
} from './order-pricing.js';
import {
  ORDER_CATALOG,
  ORDER_REPOSITORY,
  type CustomerEntry,
  type DeliveryZoneEntry,
  type OrderCatalog,
  type OrderData,
  type OrderRecord,
  type OrderRepository,
  type PaymentMethodEntry,
} from './order-repository.js';

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

@Injectable()
export class OrderService {
  constructor(
    @Inject(ORDER_REPOSITORY) private readonly orders: OrderRepository,
    @Inject(ORDER_CATALOG) private readonly catalog: OrderCatalog,
    @Inject(CLOSING_LOOKUP) private readonly closings: ClosingLookup,
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
  ): Promise<OrderRecord> {
    const input = parseOrderInput(body);
    const closing = await this.closings.getOrCreateFor(user, rawDate);
    this.closings.assertEditable(user, closing);
    const data = await this.resolveOrderData(input, closing.businessDate);
    return this.orders.create(closing.id, user.id, data);
  }

  async replace(
    user: SessionUser,
    id: number,
    body: unknown,
  ): Promise<OrderRecord> {
    const input = parseOrderInput(body);
    const { order, closing } = await this.findEditable(user, id);
    const { businessDate } = closing;
    const data = await this.resolveOrderData(input, businessDate, order.items);
    return this.orders.update(order.id, data);
  }

  async remove(user: SessionUser, id: number): Promise<void> {
    const { order } = await this.findEditable(user, id);
    await this.orders.delete(order.id);
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
  private async findEditable(
    user: SessionUser,
    id: number,
  ): Promise<{ order: OrderRecord; closing: ClosingRecord }> {
    const order = await this.orders.findById(id);
    if (!order) throw new NotFoundException(`Pedido ${id} não encontrado`);
    const closing = await this.closings.getById(order.closingId);
    this.closings.assertEditable(user, closing);
    return { order, closing };
  }

  /**
   * `businessDate` = dia do fechamento do pedido (preço da época para as linhas novas);
   * `previous` = linhas do pedido em edição, que mantêm o preço gravado.
   */
  private async resolveOrderData(
    input: OrderInput,
    businessDate: string,
    previous: OrderLine[] = [],
  ): Promise<OrderData> {
    await this.assertPaymentChoice(input);
    const { type, paymentMethodId, paymentMode } = input;
    const delivery = await this.resolveDelivery(input);
    const items = await this.priceItems(input, businessDate, previous);
    const amount = orderAmount(items, delivery.deliveryFee);
    return { amount, items, type, paymentMethodId, paymentMode, ...delivery };
  }

  private async priceItems(
    input: OrderInput,
    businessDate: string,
    previous: OrderLine[],
  ): Promise<OrderLine[]> {
    const ids = input.items.map((item) => item.productId);
    const products = await this.catalog.findProductsForSale(ids, businessDate);
    const byId = new Map(products.map((p) => [p.id, p]));
    return priceOrderLines(input.items, byId, previous);
  }

  /**
   * Balcão: sem cliente, sem bairro e taxa 0. Entrega: bairro do cadastro do cliente, taxa do
   * bairro salvo sobrescrita, e cópia de nome/telefone/rua/número/referência naquele momento.
   */
  private async resolveDelivery(
    input: OrderInput,
  ): Promise<
    Omit<
      OrderData,
      'amount' | 'items' | 'type' | 'paymentMethodId' | 'paymentMode'
    >
  > {
    if (input.customerId === null) return COUNTER_DELIVERY;
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

  /** Forma ativa; maquininha exige o meio (crédito, débito ou PIX) e as outras não aceitam meio. */
  private async assertPaymentChoice(input: OrderInput): Promise<void> {
    const method = await this.findActivePaymentMethod(input.paymentMethodId);
    const mode = JSON.stringify(input.paymentMode);
    if (method.isCardTerminal === (input.paymentMode !== null)) return;
    throw new BadRequestException(
      method.isCardTerminal
        ? `Forma de pagamento ${method.id} é maquininha: esperado "paymentMode" CREDIT, DEBIT ou PIX, recebido ${mode}`
        : `Forma de pagamento ${method.id} não é maquininha: esperado omitir "paymentMode", recebido ${mode}`,
    );
  }

  private async findActivePaymentMethod(
    id: number,
  ): Promise<PaymentMethodEntry> {
    const method = await this.catalog.findPaymentMethod(id);
    if (method?.active) return method;
    throw new BadRequestException(
      `Forma de pagamento ${id} inexistente ou inativa: esperado id de uma forma ativa em payment_methods`,
    );
  }
}
