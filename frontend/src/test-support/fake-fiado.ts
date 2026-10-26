import { ApiError, type HttpMethod } from '../api/api-client';
import type {
  FiadoDebtor,
  FiadoDueOrder,
  FiadoStatement,
  OrderFiado,
} from '../api/fiado-types';
import { centsToMoney, moneyToCents } from '../api/money';
import type { PaymentMethod } from '../api/types';

/** O fiado do fake (2026-10-25): quem deve, os do dia e os extratos, como o teste montar. */
export class FakeFiadoData {
  debtors: FiadoDebtor[] = [];
  due: FiadoDueOrder[] = [];
  /** Extrato por id do cliente; sem entrada = 404. */
  statements: Record<number, FiadoStatement> = {};
}

/**
 * Forma "Fiado" para os testes somarem às do fake (a 3ª tecla depois de PIX e Dinheiro).
 *
 * @example api.paymentMethods = [...api.paymentMethods, FIADO_METHOD];
 */
export const FIADO_METHOD: PaymentMethod = {
  id: 7,
  name: 'Fiado',
  active: true,
  sortOrder: 2,
  isCardTerminal: false,
  isCash: false,
  isFiado: true,
};

const openTotalOf = (data: FakeFiadoData, customerId: unknown): number => {
  const debtor = data.debtors.find((d) => d.customerId === customerId);
  return debtor ? moneyToCents(debtor.openTotal) : 0;
};

/**
 * O bloco `fiado` do pedido gravado, como o backend: só na forma fiado, nada recebido ainda e o
 * cliente devendo este pedido mais o que já devia.
 *
 * @example fakeOrderFiado(body, '20.00', methods, data)?.customerOpenTotal // '50.00'
 */
export function fakeOrderFiado(
  body: Record<string, unknown>,
  amount: string,
  methods: PaymentMethod[],
  data: FakeFiadoData,
): OrderFiado | null {
  const method = methods.find((m) => m.id === body.paymentMethodId);
  if (!method?.isFiado) return null;
  const owed = moneyToCents(amount) + openTotalOf(data, body.customerId);
  return {
    dueDate: (body.fiadoDueDate as string | undefined) ?? null,
    paidTotal: '0.00',
    remaining: amount,
    customerOpenTotal: centsToMoney(owed),
  };
}

const STATEMENT_ROUTE = /^\/fiado\/customers\/(\d+)$/;

function statementOf(data: FakeFiadoData, customerId: number): FiadoStatement {
  const statement = data.statements[customerId];
  if (statement) return statement;
  throw new ApiError(404, `Cliente ${customerId} não encontrado`);
}

/**
 * Rotas `/fiado` do fake: quem deve, os do dia e o extrato.
 *
 * @example fakeFiadoRoute(api.fiado, 'GET', '/fiado/open')
 */
export function fakeFiadoRoute(
  data: FakeFiadoData,
  method: HttpMethod,
  path: string,
): unknown {
  if (method === 'GET' && path === '/fiado/open') return data.debtors;
  if (method === 'GET' && path === '/fiado/due') return data.due;
  const statement = STATEMENT_ROUTE.exec(path);
  if (method === 'GET' && statement)
    return statementOf(data, Number(statement[1]));
  throw new ApiError(404, `Rota do fiado sem fake: ${method} ${path}`);
}
