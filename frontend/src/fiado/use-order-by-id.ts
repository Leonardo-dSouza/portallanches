import { useEffect, useState } from 'react';
import type { CashApi } from '../api/cash-api';
import { errorMessage } from '../api/error-message';
import type { Order } from '../api/types';

export interface OrderByIdState {
  /** O pedido inteiro; null enquanto carrega (ou se falhou). */
  order: Order | null;
  error: string | null;
}

/**
 * O pedido inteiro pelo id (`GET /orders/:id`, 2026-10-27): a aba Fiado abre o fiado de qualquer
 * noite na janela do pedido.
 *
 * @example const { order, error } = useOrderById(cash, 50);
 */
export function useOrderById(cash: CashApi, orderId: number): OrderByIdState {
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let current = true;
    cash.getOrder(orderId).then(
      (read) => current && setOrder(read),
      (failure) => current && setError(errorMessage(failure)),
    );
    return () => {
      current = false;
    };
  }, [cash, orderId]);
  return { order: order?.id === orderId ? order : null, error };
}
