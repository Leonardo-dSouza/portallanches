import { useCallback, useEffect, useState } from 'react';
import type { CashApi } from '../api/cash-api';
import { errorMessage } from '../api/error-message';
import type {
  Closing,
  DeliveryZone,
  Expense,
  ExpenseType,
  Order,
  PaymentMethod,
} from '../api/types';

/** Tudo o que as abas do caixa precisam para o dia de hoje. */
export interface CashDay {
  closing: Closing;
  paymentMethods: PaymentMethod[];
  zones: DeliveryZone[];
  expenseTypes: ExpenseType[];
  orders: Order[];
  expenses: Expense[];
}

export interface CashDayState {
  day: CashDay | null;
  error: string | null;
  reload(): Promise<void>;
}

async function loadCashDay(cash: CashApi): Promise<CashDay> {
  const [closing, paymentMethods, zones, expenseTypes, orders, expenses] =
    await Promise.all([
      cash.closingToday(),
      cash.listPaymentMethods(),
      cash.listDeliveryZones(),
      cash.listExpenseTypes(),
      cash.listOrders(),
      cash.listExpenses(),
    ]);
  return { closing, paymentMethods, zones, expenseTypes, orders, expenses };
}

/**
 * Carrega o dia ao montar e expõe `reload` (botão Atualizar e após cada gravação).
 * Sem polling: hoje há um caixa só.
 */
export function useCashDay(cash: CashApi): CashDayState {
  const [day, setDay] = useState<CashDay | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      setDay(await loadCashDay(cash));
      setError(null);
    } catch (failure) {
      setError(errorMessage(failure));
    }
  }, [cash]);

  useEffect(() => {
    let active = true;
    loadCashDay(cash).then(
      (loaded) => active && setDay(loaded),
      (failure) => active && setError(errorMessage(failure)),
    );
    return () => {
      active = false;
    };
  }, [cash]);

  return { day, error, reload };
}
