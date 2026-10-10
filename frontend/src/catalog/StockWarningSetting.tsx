import { Check } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { errorMessage } from '../api/error-message';
import type { SettingsApi } from '../api/settings-api';
import { TextField } from '../components/TextField';
import { parseStockWarning } from './stock-warning-values';

/**
 * Aviso de saldo do caixa (pedido do usuário, 2026-10-09): a bebida mostra quanto resta na
 * busca quando tiver menos que este número.
 */
export function StockWarningSetting({ settings }: { settings: SettingsApi }) {
  const [typed, setTyped] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let current = true;
    settings.readSettings().then(
      (read) => current && setTyped(String(read.lowStockWarning)),
      (failure) => current && setMessage(errorMessage(failure)),
    );
    return () => {
      current = false;
    };
  }, [settings]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const parsed = parseStockWarning(typed);
    if (!parsed.ok) return setMessage(parsed.error);
    setBusy(true);
    try {
      await settings.saveSettings({ lowStockWarning: parsed.value });
      setMessage('Aviso de saldo salvo.');
    } catch (failure) {
      setMessage(errorMessage(failure));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="card stock-warning-setting" onSubmit={submit}>
      <TextField
        label="Mostrar o saldo no caixa abaixo de (unidades; 0 = nunca)"
        inputMode="numeric"
        value={typed}
        onChange={setTyped}
      />
      <button
        type="submit"
        className="button button-secondary"
        disabled={busy}
        aria-busy={busy}
      >
        <Check aria-hidden />
        Salvar aviso
      </button>
      {message && (
        <p className="hint" role="status">
          {message}
        </p>
      )}
    </form>
  );
}
