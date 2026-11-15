import { KeyRound } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Dialog } from '../components/Dialog';
import {
  cleanPinDigits,
  MANAGER_PIN_LENGTH,
} from '../catalog/manager-pin-values';
import type { ManagerRetry } from './use-manager-retry';

interface AuthActionsProps {
  busy: boolean;
  canAuthorize: boolean;
  onClose(): void;
}

function AuthDialogActions({ busy, canAuthorize, onClose }: AuthActionsProps) {
  return (
    <div className="dialog-actions">
      <button
        type="submit"
        className="button"
        disabled={busy || !canAuthorize}
        aria-busy={busy}
      >
        <KeyRound aria-hidden />
        Autorizar
      </button>
      <button
        type="button"
        className="button button-secondary"
        onClick={onClose}
      >
        Voltar
      </button>
    </div>
  );
}

interface PinInputProps {
  value: string;
  onChange(value: string): void;
}

function ManagerPinInputField({ value, onChange }: PinInputProps) {
  return (
    <label className="field">
      Código do gerente (6 números)
      <input
        type="password"
        inputMode="numeric"
        autoComplete="off"
        // A janela abre por causa dela: o caixa já digita.
        data-autofocus
        value={value}
        onChange={(event) => onChange(cleanPinDigits(event.target.value))}
      />
    </label>
  );
}

function DialogError({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <p className="form-error" role="alert">
      {error}
    </p>
  );
}

/**
 * Janela do código do gerente no PC do caixa (2026-10-15): diz o que vai liberar, e código errado
 * ou tentativas demais ficam avisadas aqui mesmo.
 */
export function ManagerAuthDialog({ retry }: { retry: ManagerRetry }) {
  const [password, setPassword] = useState('');
  if (retry.reason === null) return null;
  const submit = (event: FormEvent) => {
    event.preventDefault();
    // O evento do React sobe pela árvore de componentes, não só pela do DOM.
    event.stopPropagation();
    void retry.submit(password);
  };
  const close = () => {
    setPassword('');
    retry.cancel();
  };
  return (
    <Dialog title="Código do gerente" onClose={close}>
      <form className="manager-auth" onSubmit={submit}>
        <p>{retry.reason}: precisa do código do gerente.</p>
        <ManagerPinInputField value={password} onChange={setPassword} />
        <DialogError error={retry.error} />
        <AuthDialogActions
          busy={retry.busy}
          canAuthorize={password.length === MANAGER_PIN_LENGTH}
          onClose={close}
        />
      </form>
    </Dialog>
  );
}
