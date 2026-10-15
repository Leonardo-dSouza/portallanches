import { KeyRound } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Dialog } from '../components/Dialog';
import type { ManagerRetry } from './use-manager-retry';

/**
 * Janela da senha do admin no PC do caixa (2026-10-15): diz o que vai liberar, e senha errada
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
    <Dialog title="Senha do admin" onClose={close}>
      <form className="manager-auth" onSubmit={submit}>
        <p>{retry.reason}: precisa da senha do admin.</p>
        <label className="field">
          Senha do admin
          <input
            type="password"
            autoComplete="off"
            // A janela abre por causa dela: o caixa já digita.
            autoFocus
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        {retry.error && (
          <p className="form-error" role="alert">
            {retry.error}
          </p>
        )}
        <div className="dialog-actions">
          <button
            type="submit"
            className="button"
            disabled={retry.busy || password === ''}
            aria-busy={retry.busy}
          >
            <KeyRound aria-hidden />
            Autorizar
          </button>
          <button
            type="button"
            className="button button-secondary"
            onClick={close}
          >
            Voltar
          </button>
        </div>
      </form>
    </Dialog>
  );
}
