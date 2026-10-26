import { useState } from 'react';
import { ApiError } from '../api/api-client';
import { errorMessage } from '../api/error-message';
import { useAuth } from '../auth/auth-context';
import { useAppSettings } from '../settings/app-settings-context';
import { needsManager, type LockSubject } from './order-lock';

export interface ManagerCancelState {
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

/** O que a janela desfaz: o nome no aviso do motivo e a chamada à API. */
export interface ManagerCancelAction {
  /** "cancelamento" ou "estorno": entra em "Escreva o motivo do …". */
  what: string;
  run(reason: string, managerPassword?: string): Promise<unknown>;
}

/**
 * Desfazer com motivo e a trava do caixa (cancelar o pedido, 2026-10-15; estornar o recebimento
 * do fiado, 2026-10-25): motivo obrigatório e, fora da trava, a senha do admin. Se a API pedir a
 * senha que a tela não esperava (relógio diferente), o campo aparece.
 *
 * @example const state = useManagerCancel(order, { what: 'cancelamento', run }, onCanceled);
 */
export function useManagerCancel(
  subject: LockSubject,
  action: ManagerCancelAction,
  onDone: () => void,
): ManagerCancelState {
  const { cashierFixMinutes } = useAppSettings();
  const role = useAuth().user?.role;
  const [now] = useState(() => new Date());
  const [reason, setReason] = useState('');
  const [password, setPassword] = useState('');
  const [asked, setAsked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const askPassword =
    asked || needsManager(subject, now, cashierFixMinutes, role);
  const submit = async () => {
    if (reason.trim().length < 3)
      return setError(
        `Escreva o motivo do ${action.what} (ao menos 3 letras).`,
      );
    setBusy(true);
    try {
      await action.run(reason.trim(), password || undefined);
      onDone();
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
