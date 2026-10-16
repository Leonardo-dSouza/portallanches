import { useState } from 'react';
import { ApiError } from '../api/api-client';
import type { CashApi } from '../api/cash-api';
import { errorMessage } from '../api/error-message';
import type { Order } from '../api/types';

export interface OrderActions {
  /** Recusa da última ação (ex.: 403 num dia fechado); some na próxima que der certo. */
  error: string | null;
  /** O pedido tem uma ação em andamento: as teclas dele ficam travadas (sem clique duplo). */
  isBusy(order: Order): boolean;
  /** Só o admin: desfaz o cancelamento. */
  restore(order: Order): void;
  advance(order: Order): void;
  revert(order: Order): void;
}

/** 409 = a lista estava velha (outro clique ou outra tela já mudou o pedido). */
const isStale = (failure: unknown) =>
  failure instanceof ApiError && failure.status === 409;

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
  const [busyIds, setBusyIds] = useState<ReadonlySet<number>>(new Set());
  const setBusy = (id: number, busy: boolean) =>
    setBusyIds((current) => {
      const next = new Set(current);
      if (busy) next.add(id);
      else next.delete(id);
      return next;
    });
  const run = (order: Order, action: () => Promise<unknown>) => {
    if (busyIds.has(order.id)) return;
    setBusy(order.id, true);
    void action()
      .then(
        () => {
          setError(null);
          onChanged();
        },
        (failure: unknown) => {
          setError(errorMessage(failure));
          if (isStale(failure)) onChanged();
        },
      )
      .finally(() => setBusy(order.id, false));
  };
  return {
    error,
    isBusy: (order) => busyIds.has(order.id),
    restore: (order) => run(order, () => cash.restoreOrder(order.id)),
    // O status que a lista mostra vai junto: clique duplo vira 409, não pula etapa (2026-10-15).
    advance: (order) =>
      run(order, () => cash.advanceOrderStatus(order.id, order.status)),
    revert: (order) =>
      run(order, () => cash.revertOrderStatus(order.id, order.status)),
  };
}
