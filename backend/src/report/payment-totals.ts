import { formatCents, toCents } from '../common/money.js';
import type { PaymentMode } from '../orders/order-input.js';
import type {
  ReportOrderRow,
  ReportPaymentMethodRow,
} from './report-source.js';

// Ordem dos meios no relatório, a mesma das teclas do caixa.
const PAYMENT_MODES: readonly PaymentMode[] = ['CREDIT', 'DEBIT', 'PIX'];

export interface PaymentModeTotal {
  mode: PaymentMode;
  ordersCount: number;
  total: string;
}

export interface PaymentMethodTotal {
  paymentMethodId: number;
  name: string;
  ordersCount: number;
  total: string;
  /** Subtotal por meio (crédito, débito, PIX) nas maquininhas; vazio nas outras formas. */
  byMode: PaymentModeTotal[];
  /** A forma fiado (2026-10-25): o total é o "a receber", fora da gaveta. */
  isFiado: boolean;
}

/** O que a soma por forma precisa de um pedido ou de um recebimento de fiado. */
export type PaidAmountRow = Pick<
  ReportOrderRow,
  'amount' | 'paymentMethodId' | 'paymentMode'
>;

export const sumCents = (values: string[]): number =>
  values.reduce((sum, value) => sum + toCents(value), 0);

const amountsTotal = (orders: PaidAmountRow[]): string =>
  formatCents(sumCents(orders.map((o) => o.amount)));

function totalsByMode(orders: PaidAmountRow[]): PaymentModeTotal[] {
  return PAYMENT_MODES.map((mode) => {
    const own = orders.filter((o) => o.paymentMode === mode);
    return { mode, ordersCount: own.length, total: amountsTotal(own) };
  }).filter((entry) => entry.ordersCount > 0);
}

/**
 * Total de cada forma de pagamento com pedidos, na ordem do cadastro; as maquininhas
 * trazem também o subtotal de cada meio.
 *
 * @example totalsByPaymentMethod(orders, methods)[0] // { name: 'PIX', ordersCount: 2, total: '75.30', byMode: [] }
 */
export function totalsByPaymentMethod(
  orders: PaidAmountRow[],
  methods: ReportPaymentMethodRow[],
): PaymentMethodTotal[] {
  return methods
    .map((method) => {
      const own = orders.filter((o) => o.paymentMethodId === method.id);
      return {
        paymentMethodId: method.id,
        name: method.name,
        ordersCount: own.length,
        total: amountsTotal(own),
        byMode: method.isCardTerminal ? totalsByMode(own) : [],
        isFiado: method.isFiado,
      };
    })
    .filter((entry) => entry.ordersCount > 0);
}
