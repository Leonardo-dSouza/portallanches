import { useState } from 'react';
import { ApiError } from '../api/api-client';
import { errorMessage } from '../api/error-message';

/** Uma ação que o caixa só faz com a senha do admin (cancelar fora da trava, reabrir…). */
export type ManagedAction = (managerPassword?: string) => Promise<void>;

interface PendingAction {
  action: ManagedAction;
  /** O que a senha vai liberar, na janela ("Reabrir a noite de 14/10"). */
  reason: string;
}

export interface ManagerRetry {
  /** O que a janela da senha mostra; null = janela fechada. */
  reason: string | null;
  error: string | null;
  busy: boolean;
  /** Tenta sem senha; se a API pedir (`MANAGER_REQUIRED`), abre a janela e repete com ela. */
  run(action: ManagedAction, reason: string): Promise<void>;
  /** Já se sabe que precisa: abre a janela direto. */
  ask(action: ManagedAction, reason: string): void;
  submit(password: string): Promise<void>;
  cancel(): void;
}

const codeOf = (failure: unknown) =>
  failure instanceof ApiError ? failure.code : null;

/** Senha errada ou tentativas demais: o aviso fica na própria janela. */
const staysInDialog = (failure: unknown) =>
  codeOf(failure) === 'MANAGER_DENIED' ||
  (failure instanceof ApiError && failure.status === 429);

/**
 * A senha do admin digitada na hora no PC do caixa (2026-10-15). Erro que não é da senha vai
 * para `onError`, como qualquer outra recusa da ação.
 *
 * @example const retry = useManagerRetry(setError); void retry.run((pw) => cash.cancelOrder(id, reason, pw), 'Cancelar o #12');
 */
export function useManagerRetry(
  onError: (message: string) => void,
): ManagerRetry {
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const ask = (action: ManagedAction, reason: string) => {
    setError(null);
    setPending({ action, reason });
  };
  const run = async (action: ManagedAction, reason: string) => {
    try {
      await action();
    } catch (failure) {
      if (codeOf(failure) === 'MANAGER_REQUIRED') return ask(action, reason);
      onError(errorMessage(failure));
    }
  };
  const submit = async (password: string) => {
    if (!pending) return;
    setBusy(true);
    try {
      await pending.action(password);
      setPending(null);
    } catch (failure) {
      if (staysInDialog(failure)) setError(errorMessage(failure));
      else {
        setPending(null);
        onError(errorMessage(failure));
      }
    } finally {
      setBusy(false);
    }
  };
  return {
    reason: pending?.reason ?? null,
    error,
    busy,
    run,
    ask,
    submit,
    cancel: () => setPending(null),
  };
}
