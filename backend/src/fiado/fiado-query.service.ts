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
  settledOf,
  statementOf,
  type FiadoDebtor,
  type FiadoDueOrder,
  type FiadoSettledCustomer,
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
   * Quem quitou tudo (2026-11-01): a aba Fiado abre o extrato dele, para ver e estornar.
   *
   * @example await queries.listSettled() // [{ name: 'Maria', lastPaidOn: '2026-11-01', … }]
   */
  async listSettled(): Promise<FiadoSettledCustomer[]> {
    const orders = await this.fiado.listOrders({});
    const nights = await this.fiado.listLastPaidNights(
      orders.map((order) => order.orderId),
    );
    return settledOf(orders, nights);
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

  /**
   * Extrato de fiado de um cliente. O caixa só vê o de quem tem (ou teve) fiado: até 2026-11-15
   * um laço pelos ids devolvia nome e telefone de todos os clientes (S-10). A mesma resposta para
   * "não existe" e "sem fiado", para não dizer quais ids existem.
   *
   * @example await queries.statement(caixa, 7) // { customer: { name: 'Maria' }, openTotal: '27.00', … }
   */
  async statement(
    user: SessionUser,
    customerId: number,
  ): Promise<FiadoStatement> {
    const [customer, orders, payments] = await Promise.all([
      this.fiado.findCustomer(customerId),
      this.fiado.listOrders({ customerId }),
      this.fiado.listPayments(customerId),
    ]);
    const hidden = user.role !== 'ADMIN' && orders.length === 0;
    if (!customer || hidden)
      throw new NotFoundException(
        `Cliente ${customerId} sem extrato de fiado: esperado um cliente com fiado`,
      );
    return statementOf(customer, orders, payments);
  }
}
