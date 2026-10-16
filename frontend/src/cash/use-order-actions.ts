import { useState } from 'react';
import type { CashApi } from '../api/cash-api';
import { errorMessage } from '../api/error-message';
import type { Order } from '../api/types';

export interface OrderActions {
  /** Recusa da última ação (ex.: 403 num dia fechado); some na próxima que der certo. */
  error: string | null;
  /** Só o admin: desfaz o cancelamento. */
  restore(order: Order): void;
  advance(order: Order): void;
  revert(order: Order): void;
}

/**
 * Ações da lista de pedidos: desfazer o cancelamento e mudar o status; depois de cada uma o dia
 * recarrega. Cancelar tem janela própria (`CancelOrderDialog`).
 *
 * @example const actions = useOrderActions(cash, onChanged); actions.advance(order);
 */
export function useOrderActions(
  cash: CashApi,
  onChanged: () => void,
): OrderActions {
  const [error, setError] = useState<string | null>(null);
  const run = (action: () => Promise<unknown>) => {
    void action().then(
      () => {
        setError(null);
        onChanged();
      },
      (failure: unknown) => setError(errorMessage(failure)),
    );
  };
  return {
    error,
    restore: (order) => run(() => cash.restoreOrder(order.id)),
    // O status que a lista mostra vai junto: clique duplo vira 409, não pula etapa (2026-10-15).
    advance: (order) =>
      run(() => cash.advanceOrderStatus(order.id, order.status)),
    revert: (order) =>
      run(() => cash.revertOrderStatus(order.id, order.status)),
  };
}
