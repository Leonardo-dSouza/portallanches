import { useEffect, useState } from 'react';
import type { CashApi } from '../api/cash-api';
import { errorMessage } from '../api/error-message';
import type { FiadoStatement } from '../api/fiado-types';

export interface FiadoStatementState {
  /** O extrato do cliente escolhido; null enquanto carrega (ou sem cliente). */
  statement: FiadoStatement | null;
  error: string | null;
  /** Relê depois de receber, remarcar ou estornar. */
  reload(): void;
}

interface Failure {
  customerId: number;
  message: string;
}

/**
 * O extrato do cliente escolhido na aba Fiado (`GET /fiado/customers/:id`). Trocar de cliente
 * não mostra o extrato (nem o erro) do anterior.
 *
 * @example const { statement, reload } = useFiadoStatement(cash, 15);
 */
export function useFiadoStatement(
  cash: CashApi,
  customerId: number | null,
): FiadoStatementState {
  const [statement, setStatement] = useState<FiadoStatement | null>(null);
  const [failure, setFailure] = useState<Failure | null>(null);
  const [version, setVersion] = useState(0);
  useEffect(() => {
    if (customerId === null) return;
    let current = true;
    cash.fiadoStatement(customerId).then(
      (read) => current && setStatement(read),
      (error) =>
        current && setFailure({ customerId, message: errorMessage(error) }),
    );
    return () => {
      current = false;
    };
  }, [cash, customerId, version]);
  return {
    statement: statement?.customer.id === customerId ? statement : null,
    error: failure?.customerId === customerId ? failure.message : null,
    reload: () => setVersion((before) => before + 1),
  };
}
