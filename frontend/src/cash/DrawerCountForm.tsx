import type { KeyboardEvent } from 'react';
import { useRef, useState } from 'react';
import type { CashApi } from '../api/cash-api';
import { errorMessage } from '../api/error-message';
import type { DrawerToCount } from '../api/types';
import { TextField } from '../components/TextField';
import { buildDrawerCount, drawerCountFieldLabel } from './drawer-count-values';

interface DrawerCountFormProps {
  cash: CashApi;
  toCount: readonly DrawerToCount[];
  onClosed(): void;
  blocked?: boolean;
}

/** Enter passa adiante em vez de enviar o formulário: fechar é irreversível para o caixa. */
function passOnEnter(
  event: KeyboardEvent<HTMLInputElement>,
  next: () => void,
): void {
  if (event.key !== 'Enter') return;
  event.preventDefault();
  next();
}

/** Grava a contagem (que fecha o dia); trava enquanto grava contra clique ou Enter duplo. */
function useDrawerCountSubmit(
  cash: CashApi,
  toCount: readonly DrawerToCount[],
  onClosed: () => void,
) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = async (values: Record<number, string>, note: string) => {
    if (busy) return;
    const parsed = buildDrawerCount(toCount, values, note);
    if (!parsed.ok) return setError(parsed.error);
    setBusy(true);
    setError(null);
    try {
      await cash.closeToday(parsed.count);
      onClosed();
    } catch (failure) {
      setError(errorMessage(failure));
      setBusy(false);
    }
  };
  return { busy, error, submit };
}

/**
 * Formulário da contagem da gaveta (card 7, 2026-11-12): contagem cega (nunca mostra o
 * esperado), um campo por forma, observação opcional; "Conferir e fechar" grava e fecha o dia.
 *
 * @example <DrawerCountForm cash={cash} toCount={report.drawer.toCount} onClosed={reload} />
 */
export function DrawerCountForm({
  cash,
  toCount,
  onClosed,
  blocked = false,
}: DrawerCountFormProps) {
  const [values, setValues] = useState<Record<number, string>>({});
  const [note, setNote] = useState('');
  const { busy, error, submit } = useDrawerCountSubmit(cash, toCount, onClosed);
  const fields = useRef<(HTMLInputElement | null)[]>([]);
  const submitKey = useRef<HTMLButtonElement | null>(null);
  // A observação é o último campo: Enter nela leva à tecla, que só grava com outro Enter.
  const focusField = (index: number) => fields.current[index]?.focus();
  return (
    <form className="drawer-count-form" onSubmit={(e) => e.preventDefault()}>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {toCount.map((item, index) => (
        <TextField
          key={item.paymentMethodId}
          label={drawerCountFieldLabel(item)}
          inputMode="decimal"
          value={values[item.paymentMethodId] ?? ''}
          disabled={busy}
          ref={(input) => {
            fields.current[index] = input;
          }}
          onChange={(typed) =>
            setValues((prev) => ({ ...prev, [item.paymentMethodId]: typed }))
          }
          onKeyDown={(event) => passOnEnter(event, () => focusField(index + 1))}
        />
      ))}
      <TextField
        label="Observação"
        placeholder="Ex.: tirei R$ 15 para a gasolina do motoboy"
        value={note}
        disabled={busy}
        ref={(input) => {
          fields.current[toCount.length] = input;
        }}
        onChange={setNote}
        onKeyDown={(event) =>
          passOnEnter(event, () => submitKey.current?.focus())
        }
      />
      <div className="close-day">
        <button
          ref={submitKey}
          type="button"
          className="button"
          disabled={blocked || busy}
          aria-busy={busy}
          onClick={() => void submit(values, note)}
        >
          Conferir e fechar
        </button>
      </div>
    </form>
  );
}
