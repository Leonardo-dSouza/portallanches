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
  /** Presente no modo correção (admin, com Voltar). Omitido no modo abertura. */
  onClose?: () => void;
  /**
   * Modo abertura: "Agora não" (e Esc) fecha sem gravar (hotfix 2026-11-13: quem entra só para
   * consultar não é preso; lançar continua pedindo a abertura).
   */
  onDismiss?: () => void;
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

/** A tecla ao lado do Salvar: "Voltar" na correção, "Agora não" na abertura. */
function SecondaryKey(props: {
  label: string;
  busy: boolean;
  onClick?: () => void;
}) {
  if (!props.onClick) return null;
  return (
    <button
      type="button"
      className="button button-secondary"
      disabled={props.busy}
      onClick={props.onClick}
    >
      {props.label}
    </button>
  );
}

/**
 * Diálogo de abertura do caixa ("Agora não" fecha) ou de correção (admin com Voltar).
 *
 * @example <OpeningDrawerDialog cash={cash} initialAmount="30.00" onDismiss={later} onSaved={reload} />
 */
export function OpeningDrawerDialog(props: OpeningDrawerDialogProps) {
  const { cash, initialAmount, onClose, onDismiss, onSaved } = props;
  const isCorrection = onClose !== undefined;
  const [value, setValue] = useState(() => typedMoney(initialAmount));
  const { error, busy, submit } = useOpeningDrawerSubmit(cash, value, onSaved);
  const title = isCorrection ? 'Corrigir troco inicial' : 'Abrir o caixa';
  return (
    <Dialog title={title} onClose={onClose ?? onDismiss}>
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
          <SecondaryKey
            label={isCorrection ? 'Voltar' : 'Agora não'}
            busy={busy}
            onClick={onClose ?? onDismiss}
          />
        </div>
      </form>
    </Dialog>
  );
}
