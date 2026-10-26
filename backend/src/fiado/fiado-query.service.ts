import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { SessionUser } from '../auth/session-user.js';
import {
  CLOSING_LOOKUP,
  type ClosingLookup,
} from '../closing/closing-lookup.js';
import { FIADO_REPOSITORY, type FiadoRepository } from './fiado-repository.js';
import {
  debtorsOf,
  dueOn,
  statementOf,
  type FiadoDebtor,
  type FiadoDueOrder,
  type FiadoStatement,
} from './fiado-views.js';

/**
 * As leituras do fiado (2026-10-25): quem deve, o que cobrar na noite e o extrato do cliente.
 * Caixa e admin veem tudo; só a noite dos "do dia" segue a regra de datas do caixa.
 */
@Injectable()
export class FiadoQueryService {
  constructor(
    @Inject(FIADO_REPOSITORY) private readonly fiado: FiadoRepository,
    @Inject(CLOSING_LOOKUP) private readonly closings: ClosingLookup,
  ) {}

  /** @example await queries.listOpen() // [{ name: 'Maria', openTotal: '47.00', orders: [...] }] */
  async listOpen(): Promise<FiadoDebtor[]> {
    return debtorsOf(await this.fiado.listOrders({}));
  }

  /**
   * Os fiados de outras noites a cobrar nesta (previsão até a data, o atrasado também). Sem
   * data, a noite em andamento.
   *
   * @example await queries.listDue(user) // [{ orderId: 12, customerName: 'Maria', … }]
   */
  async listDue(user: SessionUser, rawDate?: string): Promise<FiadoDueOrder[]> {
    const { businessDate } = await this.closings.getFor(user, rawDate);
    const orders = await this.fiado.listOrders({ dueBy: businessDate });
    return dueOn(orders, businessDate);
  }

  /** @example await queries.statement(7) // { customer: { name: 'Maria' }, openTotal: '27.00', … } */
  async statement(customerId: number): Promise<FiadoStatement> {
    const customer = await this.fiado.findCustomer(customerId);
    if (!customer)
      throw new NotFoundException(`Cliente ${customerId} não encontrado`);
    const [orders, payments] = await Promise.all([
      this.fiado.listOrders({ customerId }),
      this.fiado.listPayments(customerId),
    ]);
    return statementOf(customer, orders, payments);
  }
}
