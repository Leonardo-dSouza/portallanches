import type { CashApi } from '../api/cash-api';
import type { Order } from '../api/types';
import {
  useManagerCancel,
  type ManagerCancelState,
} from './use-manager-cancel';

/** Motivos que mais aparecem: um clique preenche (o texto continua editável). */
export const QUICK_CANCEL_REASONS = [
  'Cliente desistiu',
  'Lançado errado',
  'Pedido duplicado',
] as const;

export type CancelOrderState = ManagerCancelState;

/**
 * Janela de cancelar (2026-10-15): motivo obrigatório e, fora da trava do caixa, a senha do
 * admin. Se a API pedir a senha que a tela não esperava (relógio diferente), o campo aparece.
 *
 * @example const state = useCancelOrder(cash, order, onCanceled);
 */
export function useCancelOrder(
  cash: CashApi,
  order: Order,
  onCanceled: () => void,
): CancelOrderState {
  return useManagerCancel(
    order,
    {
      what: 'cancelamento',
      run: (reason, password) => cash.cancelOrder(order.id, reason, password),
    },
    onCanceled,
  );
}
