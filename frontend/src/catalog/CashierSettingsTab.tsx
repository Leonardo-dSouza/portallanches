import { Check } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { errorMessage } from '../api/error-message';
import type { SettingsApi } from '../api/settings-api';
import type { CashShortcuts } from '../api/types';
import { ALLOWED_SHORTCUTS } from '../cash/shortcut-keys';
import { SelectField } from '../components/SelectField';
import { TextField } from '../components/TextField';
import {
  DEFAULT_APP_SETTINGS,
  useMergeAppSettings,
} from '../settings/app-settings-context';
import {
  parseCashierSettings,
  SHORTCUT_LABELS,
  type CashierSettings,
  type CashierSettingsForm,
} from './cashier-settings-values';

const KEY_OPTIONS = ALLOWED_SHORTCUTS.map((key) => ({
  value: key,
  label: key,
}));
const ACTIONS = Object.keys(SHORTCUT_LABELS) as (keyof CashShortcuts)[];

const formOf = (read: CashierSettings): CashierSettingsForm => ({
  shortcuts: read.cashShortcuts,
  fixMinutes: String(read.cashierFixMinutes),
});

/** Lê o gravado ao abrir; salvar troca na hora neste PC (os outros pegam ao recarregar). */
function useCashierSettingsForm(settings: SettingsApi) {
  const merge = useMergeAppSettings();
  const [form, setForm] = useState(() => formOf(DEFAULT_APP_SETTINGS));
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let current = true;
    settings.readSettings().then(
      (read) => current && setForm(formOf(read)),
      (failure) => current && setMessage(errorMessage(failure)),
    );
    return () => {
      current = false;
    };
  }, [settings]);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const parsed = parseCashierSettings(form);
    if (!parsed.ok) return setMessage(parsed.error);
    setBusy(true);
    try {
      merge(await settings.saveSettings(parsed.value));
      setMessage('Atalhos e trava salvos.');
    } catch (failure) {
      setMessage(errorMessage(failure));
    } finally {
      setBusy(false);
    }
  };
  return { form, setForm, message, busy, submit };
}

/**
 * Cadastros → Comanda e ajustes → Caixa (2026-10-15): as teclas dos atalhos da comanda (o
 * cliente não gostou do Ctrl+Enter) e quantos minutos o caixa tem para cancelar ou diminuir um
 * pedido sem a senha do admin.
 */
export function CashierSettingsTab({ settings }: { settings: SettingsApi }) {
  const { form, setForm, message, busy, submit } =
    useCashierSettingsForm(settings);
  const pick = (action: keyof CashShortcuts) => (key: string) =>
    setForm({ ...form, shortcuts: { ...form.shortcuts, [action]: key } });
  return (
    <form className="card cashier-settings" onSubmit={submit}>
      <fieldset>
        <legend>Atalhos da comanda</legend>
        {ACTIONS.map((action) => (
          <SelectField
            key={action}
            label={SHORTCUT_LABELS[action]}
            value={form.shortcuts[action]}
            options={KEY_OPTIONS}
            onChange={pick(action)}
          />
        ))}
      </fieldset>
      <fieldset>
        <legend>Trava do caixa</legend>
        <TextField
          label="Minutos para o caixa cancelar ou diminuir sem a senha do admin"
          inputMode="numeric"
          value={form.fixMinutes}
          onChange={(fixMinutes) => setForm({ ...form, fixMinutes })}
        />
        <p className="hint">
          Vale enquanto o pedido está Em preparo. Depois disso, cancelar, baixar
          o valor ou trocar a forma de pagamento pede a senha do admin. 0 =
          sempre pedir.
        </p>
      </fieldset>
      <button type="submit" className="button" disabled={busy} aria-busy={busy}>
        <Check aria-hidden />
        Salvar atalhos e trava
      </button>
      {message && (
        <p className="hint" role="status">
          {message}
        </p>
      )}
    </form>
  );
}
