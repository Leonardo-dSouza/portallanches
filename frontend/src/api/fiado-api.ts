import type { ApiClient } from './api-client';
import type {
  FiadoDebtor,
  FiadoDueOrder,
  FiadoPaymentInput,
  FiadoReceipt,
  FiadoStatement,
} from './fiado-types';

/** Chamadas do fiado (2026-10-25); entram no `CashApi`, porque o caixa lança e recebe sozinho. */
export interface FiadoCalls {
  /** Quem deve, com os pedidos em aberto (a aba Fiado e o "Já deve" da comanda). */
  listFiadoDebtors(): Promise<FiadoDebtor[]>;
  /** Fiados de outras noites a cobrar na noite do caixa (previsão até ela, atrasados também). */
  listFiadoDue(): Promise<FiadoDueOrder[]>;
  fiadoStatement(customerId: number): Promise<FiadoStatement>;
  /** Entra na gaveta da noite do caixa (a escolhida, ou a em andamento). */
  receiveFiado(
    orderId: number,
    input: FiadoPaymentInput,
  ): Promise<FiadoReceipt>;
  /** A trava do cancelar: fora dela, a API pede a senha do admin (403 `MANAGER_REQUIRED`). */
  cancelFiadoPayment(
    paymentId: number,
    reason: string,
    managerPassword?: string,
  ): Promise<FiadoReceipt>;
  /** Nova previsão (`AAAA-MM-DD`) ou null ("Sem data"); não pede senha. */
  rescheduleFiado(
    orderId: number,
    dueDate: string | null,
  ): Promise<{ orderId: number; dueDate: string | null }>;
}

/**
 * @param date noite escolhida (`AAAA-MM-DD`) ou null para a noite em andamento do servidor.
 * @example await fiadoCalls(api, null).listFiadoDebtors();
 */
export function fiadoCalls(api: ApiClient, date: string | null): FiadoCalls {
  const onNight = date === null ? {} : { date };
  return {
    listFiadoDebtors: () => api.request('GET', '/fiado/open'),
    listFiadoDue: () =>
      api.request(
        'GET',
        date === null ? '/fiado/due' : `/fiado/due?date=${date}`,
      ),
    fiadoStatement: (customerId) =>
      api.request('GET', `/fiado/customers/${customerId}`),
    receiveFiado: (orderId, input) =>
      api.request('POST', `/fiado/orders/${orderId}/payments`, {
        ...input,
        ...onNight,
      }),
    cancelFiadoPayment: (paymentId, reason, managerPassword) =>
      api.request('POST', `/fiado/payments/${paymentId}/cancel`, {
        reason,
        ...(managerPassword === undefined ? {} : { managerPassword }),
      }),
    rescheduleFiado: (orderId, dueDate) =>
      api.request('PUT', `/fiado/orders/${orderId}/due-date`, { dueDate }),
  };
}
