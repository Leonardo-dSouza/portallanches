import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { ClosingRecord } from '../closing/closing-repository.js';
import type { SessionUser } from '../auth/session-user.js';
import { CLOSING_LOOKUP, type ClosingLookup } from './closing-lookup.js';
import { parseOrderInput, type OrderInput } from './order-input.js';
import {
  ORDER_CATALOG,
  ORDER_REPOSITORY,
  type OrderCatalog,
  type OrderData,
  type OrderRecord,
  type OrderRepository,
} from './order-repository.js';

@Injectable()
export class OrderService {
  constructor(
    @Inject(ORDER_REPOSITORY) private readonly orders: OrderRepository,
    @Inject(ORDER_CATALOG) private readonly catalog: OrderCatalog,
    @Inject(CLOSING_LOOKUP) private readonly closings: ClosingLookup,
  ) {}

  /**
   * Lança um pedido no fechamento de hoje. Balcão grava taxa 0; entrega copia a
   * taxa do bairro, salvo sobrescrita informada.
   *
   * @example await service.create(user, { amount: 30, type: 'COUNTER', paymentMethodId: 1 });
   */
  async create(user: SessionUser, body: unknown): Promise<OrderRecord> {
    const input = parseOrderInput(body);
    const today = await this.closings.getOrCreateToday();
    this.assertCanEdit(user, today, today.id);
    const data = await this.resolveOrderData(input);
    return this.orders.create(today.id, user.id, data);
  }

  async replace(
    user: SessionUser,
    id: number,
    body: unknown,
  ): Promise<OrderRecord> {
    const input = parseOrderInput(body);
    const existing = await this.findEditable(user, id);
    return this.orders.update(existing.id, await this.resolveOrderData(input));
  }

  async remove(user: SessionUser, id: number): Promise<void> {
    const existing = await this.findEditable(user, id);
    await this.orders.delete(existing.id);
  }

  async listToday(): Promise<OrderRecord[]> {
    const today = await this.closings.getOrCreateToday();
    return this.orders.listByClosing(today.id);
  }

  async listByDate(rawDate: string): Promise<OrderRecord[]> {
    const closing = await this.closings.getByDate(rawDate);
    return this.orders.listByClosing(closing.id);
  }

  private async findEditable(
    user: SessionUser,
    id: number,
  ): Promise<OrderRecord> {
    const existing = await this.orders.findById(id);
    if (!existing) throw new NotFoundException(`Pedido ${id} não encontrado`);
    const today = await this.closings.getOrCreateToday();
    this.assertCanEdit(user, today, existing.closingId);
    return existing;
  }

  /** Admin edita qualquer dia; caixa só o dia de hoje e enquanto estiver aberto. */
  private assertCanEdit(
    user: SessionUser,
    today: ClosingRecord,
    orderClosingId: number,
  ): void {
    if (user.role === 'ADMIN') return;
    if (orderClosingId !== today.id) {
      throw new ForbiddenException(
        `Perfil CAIXA só edita pedidos de hoje (${today.businessDate}): esperado pedido do fechamento ${today.id}, recebido ${orderClosingId}`,
      );
    }
    if (today.status === 'CLOSED') {
      throw new ForbiddenException(
        `O fechamento de ${today.businessDate} está fechado: só um ADMIN pode reabrir ou editar`,
      );
    }
  }

  private async resolveOrderData(input: OrderInput): Promise<OrderData> {
    await this.assertPaymentMethodActive(input.paymentMethodId);
    const { amount, type, paymentMethodId } = input;
    const delivery = await this.resolveDelivery(input);
    return { amount, type, paymentMethodId, ...delivery };
  }

  /** Balcão: sem bairro e taxa 0. Entrega: taxa do bairro, salvo sobrescrita. */
  private async resolveDelivery(
    input: OrderInput,
  ): Promise<Pick<OrderData, 'deliveryZoneId' | 'deliveryFee'>> {
    if (input.deliveryZoneId === null) {
      return { deliveryZoneId: null, deliveryFee: '0.00' };
    }
    const zone = await this.catalog.findDeliveryZone(input.deliveryZoneId);
    if (!zone?.active) {
      throw new BadRequestException(
        `Bairro ${input.deliveryZoneId} inexistente ou inativo: esperado id de um bairro ativo em delivery_zones`,
      );
    }
    return {
      deliveryZoneId: zone.id,
      deliveryFee: input.deliveryFee ?? zone.fee,
    };
  }

  private async assertPaymentMethodActive(id: number): Promise<void> {
    const method = await this.catalog.findPaymentMethod(id);
    if (method?.active) return;
    throw new BadRequestException(
      `Forma de pagamento ${id} inexistente ou inativa: esperado id de uma forma ativa em payment_methods`,
    );
  }
}
