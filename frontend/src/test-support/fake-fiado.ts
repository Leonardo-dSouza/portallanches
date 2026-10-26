import { ApiError, type HttpMethod } from '../api/api-client';
import type {
  FiadoDebtor,
  FiadoDueOrder,
  FiadoPayment,
  FiadoStatement,
  OrderFiado,
} from '../api/fiado-types';
import { centsToMoney, moneyToCents } from '../api/money';
import type { PaymentMethod, PaymentMode } from '../api/types';
import { requireFakeManager } from './fake-manager';

/** O fiado do fake (2026-10-25): quem deve, os do dia e os extratos, como o teste montar. */
export class FakeFiadoData {
  debtors: FiadoDebtor[] = [];
  due: FiadoDueOrder[] = [];
  /** Extrato por id do cliente; sem entrada = 404. */
  statements: Record<number, FiadoStatement> = {};
  /** Recusa do Receber (422 acima do que falta, 409 já pago…); null = aceita. */
  refusal: ApiError | null = null;
  /** Recebimentos gravados pelo Receber. */
  payments: FiadoPayment[] = [];
  /** Fora da trava: estornar pede a senha do admin (o backend decide pela hora). */
  cancelNeedsManager = false;
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
const ORDER_ROUTE = /^\/fiado\/orders\/(\d+)\/(payments|due-date)$/;

type Body = Record<string, unknown>;

function statementOf(data: FakeFiadoData, customerId: number): FiadoStatement {
  const statement = data.statements[customerId];
  if (statement) return statement;
  throw new ApiError(404, `Cliente ${customerId} não encontrado`);
}

/** O recebimento como o backend grava, na noite dos testes (22/09). */
function paymentFrom(
  body: Body,
  orderId: number,
  due: FiadoDueOrder | undefined,
  id: number,
): FiadoPayment {
  return {
    id,
    orderId,
    orderDayNumber: due?.dayNumber ?? 0,
    orderBusinessDate: due?.businessDate ?? '2026-09-22',
    closingId: 10,
    businessDate: '2026-09-22',
    amount: String(body.amount),
    extra: String(body.extra ?? '0.00'),
    paymentMethodId: Number(body.paymentMethodId),
    paymentMode: (body.paymentMode as PaymentMode | undefined) ?? null,
    createdAt: '2026-09-22T23:50:00Z',
    canceledAt: null,
    cancelReason: null,
  };
}

/** `POST /fiado/orders/:id/payments`: o recibo com o que falta depois (dos fiados do dia). */
function receive(data: FakeFiadoData, orderId: number, body: Body) {
  if (data.refusal) throw data.refusal;
  const due = data.due.find((d) => d.orderId === orderId);
  const payment = paymentFrom(body, orderId, due, 900 + data.payments.length);
  data.payments.push(payment);
  const before = moneyToCents(due?.remaining ?? payment.amount);
  const remaining = centsToMoney(
    Math.max(0, before - moneyToCents(payment.amount)),
  );
  const customerOpenTotal = remaining;
  const customer = { customerId: due?.customerId ?? 0 };
  const customerName = due?.customerName ?? '';
  return { payment, ...customer, customerName, remaining, customerOpenTotal };
}

const CANCEL_ROUTE = /^\/fiado\/payments\/(\d+)\/cancel$/;

/** `POST /fiado/payments/:id/cancel`: o recebimento do extrato, estornado com o motivo. */
function cancelPayment(data: FakeFiadoData, paymentId: number, body: Body) {
  if (data.cancelNeedsManager) requireFakeManager('CAIXA', body);
  const statement = Object.values(data.statements).find((s) =>
    s.payments.some((p) => p.id === paymentId),
  );
  const found = statement?.payments.find((p) => p.id === paymentId);
  if (!statement || !found)
    throw new ApiError(404, `Recebimento ${paymentId} não encontrado`);
  const payment = {
    ...found,
    canceledAt: '2026-09-22T23:55:00Z',
    cancelReason: String(body.reason),
  };
  const { id: customerId, name: customerName } = statement.customer;
  const remaining = statement.openTotal;
  return {
    payment,
    customerId,
    customerName,
    remaining,
    customerOpenTotal: remaining,
  };
}

function orderRoute(data: FakeFiadoData, path: string, body: Body): unknown {
  const [, id, action] = ORDER_ROUTE.exec(path) ?? [];
  if (action === 'payments') return receive(data, Number(id), body);
  return { orderId: Number(id), dueDate: body.dueDate ?? null };
}

/**
 * Rotas `/fiado` do fake: quem deve, os do dia, o extrato, o Receber e o Remarcar.
 *
 * @example fakeFiadoRoute(api.fiado, 'GET', '/fiado/open', {})
 */
export function fakeFiadoRoute(
  data: FakeFiadoData,
  method: HttpMethod,
  path: string,
  body: Body,
): unknown {
  if (method === 'GET' && path === '/fiado/open') return data.debtors;
  if (method === 'GET' && path === '/fiado/due') return data.due;
  const statement = STATEMENT_ROUTE.exec(path);
  if (method === 'GET' && statement)
    return statementOf(data, Number(statement[1]));
  if (method !== 'GET' && ORDER_ROUTE.test(path))
    return orderRoute(data, path, body);
  const cancel = CANCEL_ROUTE.exec(path);
  if (method === 'POST' && cancel)
    return cancelPayment(data, Number(cancel[1]), body);
  throw new ApiError(404, `Rota do fiado sem fake: ${method} ${path}`);
}
