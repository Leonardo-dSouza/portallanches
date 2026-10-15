import { useState } from 'react';
import { ApiError } from '../api/api-client';
import type { CashApi } from '../api/cash-api';
import { errorMessage } from '../api/error-message';
import type { Order } from '../api/types';
import { useAuth } from '../auth/auth-context';
import { useAppSettings } from '../settings/app-settings-context';
import { needsManager } from './order-lock';

/** Motivos que mais aparecem: um clique preenche (o texto continua editável). */
export const QUICK_CANCEL_REASONS = [
  'Cliente desistiu',
  'Lançado errado',
  'Pedido duplicado',
] as const;

export interface CancelOrderState {
  reason: string;
  setReason(reason: string): void;
  password: string;
  setPassword(password: string): void;
  /** Mostra o campo da senha do admin (a trava vale, ou a API pediu). */
  askPassword: boolean;
  error: string | null;
  busy: boolean;
  submit(): Promise<void>;
}

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
  const { cashierFixMinutes } = useAppSettings();
  const role = useAuth().user?.role;
  const [now] = useState(() => new Date());
  const [reason, setReason] = useState('');
  const [password, setPassword] = useState('');
  const [asked, setAsked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const askPassword =
    asked || needsManager(order, now, cashierFixMinutes, role);
  const submit = async () => {
    if (reason.trim().length < 3)
      return setError('Escreva o motivo do cancelamento (ao menos 3 letras).');
    setBusy(true);
    try {
      await cash.cancelOrder(order.id, reason.trim(), password || undefined);
      onCanceled();
    } catch (failure) {
      const required =
        failure instanceof ApiError && failure.code === 'MANAGER_REQUIRED';
      if (required) setAsked(true);
      setError(errorMessage(failure));
    } finally {
      setBusy(false);
    }
  };
  return {
    reason,
    setReason,
    password,
    setPassword,
    askPassword,
    error,
    busy,
    submit,
  };
}
