import { Banknote, Check } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import type { CashApi } from '../api/cash-api';
import { errorMessage } from '../api/error-message';
import { typedMoney } from '../api/money';
import type { Money } from '../api/types';
import { Dialog } from '../components/Dialog';
import { TextField } from '../components/TextField';
import { parseDrawerAmount } from '../catalog/drawer-settings-values';

export interface OpeningDrawerDialogProps {
  cash: CashApi;
  /** Valor inicial do troco (`Money`, ex.: `'30.00'`). */
  initialAmount: Money;
  /** Presente no modo correção para permitir fechar. Omitido no modo abertura (bloqueia). */
  onClose?: () => void;
  /** Chamado após gravar com sucesso na API. */
  onSaved(): void;
}

function useOpeningDrawerSubmit(
  cash: CashApi,
  value: string,
  onSaved: () => void,
) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    const parsed = parseDrawerAmount(value, 'o troco inicial');
    if (!parsed.ok) return setError(parsed.error);
    setBusy(true);
    setError(null);
    try {
      await cash.openDrawer(parsed.value);
      onSaved();
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setBusy(false);
    }
  };
  return { error, busy, submit };
}

/**
 * Diálogo de abertura do caixa (obrigatório, sem fechar) ou de correção (admin com Voltar).
 *
 * @example <OpeningDrawerDialog cash={cash} initialAmount="30.00" onSaved={reload} />
 */
export function OpeningDrawerDialog(props: OpeningDrawerDialogProps) {
  const { cash, initialAmount, onClose, onSaved } = props;
  const isCorrection = onClose !== undefined;
  const [value, setValue] = useState(() => typedMoney(initialAmount));
  const { error, busy, submit } = useOpeningDrawerSubmit(cash, value, onSaved);
  const title = isCorrection ? 'Corrigir troco inicial' : 'Abrir o caixa';
  return (
    <Dialog title={title} onClose={onClose}>
      <form className="opening-drawer-form" onSubmit={submit}>
        {!isCorrection && <p className="hint">Conte as notas da gaveta.</p>}
        <TextField
          label="Troco inicial"
          inputMode="decimal"
          data-autofocus
          value={value}
          onChange={setValue}
          onFocus={(event) => event.target.select()}
        />
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="dialog-actions">
          <button
            type="submit"
            className="button"
            disabled={busy}
            aria-busy={busy}
          >
            {isCorrection ? <Check aria-hidden /> : <Banknote aria-hidden />}
            {isCorrection ? 'Salvar' : 'Abrir o caixa'}
          </button>
          {isCorrection && (
            <button
              type="button"
              className="button button-secondary"
              disabled={busy}
              onClick={onClose}
            >
              Voltar
            </button>
          )}
        </div>
      </form>
    </Dialog>
  );
}
