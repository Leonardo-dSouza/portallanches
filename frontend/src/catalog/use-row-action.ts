import { useState } from 'react';
import { catalogErrorMessage } from './catalog-errors';

export interface RowContext {
  onSaved(): void;
  onError(message: string): void;
}

/**
 * Executa uma gravação de linha: marca ocupado, avisa `onSaved` no sucesso ou `onError`
 * com mensagem em português. Devolve se deu certo (para fechar o modo edição).
 */
export function useRowAction({ onSaved, onError }: RowContext) {
  const [busy, setBusy] = useState(false);
  const run = async (action: () => Promise<unknown>): Promise<boolean> => {
    setBusy(true);
    try {
      await action();
      onSaved();
      return true;
    } catch (failure) {
      onError(catalogErrorMessage(failure));
      return false;
    } finally {
      setBusy(false);
    }
  };
  return { busy, run };
}
