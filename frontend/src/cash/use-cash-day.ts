import { useCallback, useEffect, useRef, useState } from 'react';
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
import type {
  FiadoDebtor,
  FiadoDueOrder,
  FiadoSettledCustomer,
} from '../api/fiado-types';
import type { StaffConsumption } from '../api/staff-consumption-types';
import type { MenuItem } from './menu-lookup';

/** Tudo o que as abas do caixa precisam para o dia de hoje. */
export interface CashDay {
  closing: Closing;
  paymentMethods: PaymentMethod[];
  zones: DeliveryZone[];
  expenseTypes: ExpenseType[];
  orders: Order[];
  expenses: Expense[];
  /** Cardápio vendável no dia do caixa, com o preço daquele dia, para a comanda. */
  menu: MenuItem[];
  /** Consumo interno do dia (2026-10-23) e os nomes já usados no "Para quem". */
  staffConsumptions: StaffConsumption[];
  consumerNames: string[];
  /** Quem deve no fiado (2026-10-25): o "Já deve" da comanda e a aba Fiado. */
  fiadoDebtors: FiadoDebtor[];
  /** Quem quitou tudo (2026-11-01): a aba Fiado segue abrindo o extrato dele. */
  fiadoSettled: FiadoSettledCustomer[];
  /** Fiados de outras noites a cobrar nesta: no topo de Todos e A pagar. */
  fiadoDue: FiadoDueOrder[];
}

export interface CashDayState {
  day: CashDay | null;
  error: string | null;
  reload(): Promise<void>;
}

async function loadCatalogs(cash: CashApi) {
  const [paymentMethods, zones, expenseTypes, menu, consumerNames] =
    await Promise.all([
      cash.listPaymentMethods(),
      cash.listDeliveryZones(),
      cash.listExpenseTypes(),
      cash.listMenu(),
      cash.listConsumerNames(),
    ]);
  return { paymentMethods, zones, expenseTypes, menu, consumerNames };
}

async function loadFiado(cash: CashApi) {
  const [fiadoDebtors, fiadoSettled, fiadoDue] = await Promise.all([
    cash.listFiadoDebtors(),
    cash.listFiadoSettled(),
    cash.listFiadoDue(),
  ]);
  return { fiadoDebtors, fiadoSettled, fiadoDue };
}

async function loadCashDay(cash: CashApi): Promise<CashDay> {
  const [closing, orders, expenses, staffConsumptions, fiado, catalogs] =
    await Promise.all([
      cash.closingToday(),
      cash.listOrders(),
      cash.listExpenses(),
      cash.listStaffConsumptions(),
      loadFiado(cash),
      loadCatalogs(cash),
    ]);
  return {
    closing,
    orders,
    expenses,
    staffConsumptions,
    ...fiado,
    ...catalogs,
  };
}

/**
 * Carrega o dia ao montar e expõe `reload` (botão Atualizar e após cada gravação).
 * Polling de 20 s ativo quando celular e PC usam o caixa ao mesmo tempo (2026-11-05);
 * quem liga o intervalo é `useAutoRefresh` no `CashDayScreen`.
 */
export function useCashDay(cash: CashApi): CashDayState {
  const [day, setDay] = useState<CashDay | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Contador de requisições: só aplica o resultado da chamada mais recente,
  // descartando respostas lentas que chegam depois de um reload mais novo (2026-11-05).
  const reqCounterRef = useRef(0);

  const reload = useCallback(async () => {
    reqCounterRef.current += 1;
    const reqId = reqCounterRef.current;
    try {
      const loaded = await loadCashDay(cash);
      if (reqId === reqCounterRef.current) {
        setDay(loaded);
        setError(null);
      }
    } catch (failure) {
      if (reqId === reqCounterRef.current) {
        setError(errorMessage(failure));
      }
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
