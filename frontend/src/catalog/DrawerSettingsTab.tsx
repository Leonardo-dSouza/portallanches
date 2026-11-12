import { Check } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { errorMessage } from '../api/error-message';
import type { SettingsApi } from '../api/settings-api';
import { TextField } from '../components/TextField';
import {
  DEFAULT_APP_SETTINGS,
  useMergeAppSettings,
} from '../settings/app-settings-context';
import {
  drawerFormOf,
  parseDrawerSettings,
  type DrawerSettingsForm,
} from './drawer-settings-values';

function useDrawerSettingsLoad(
  settings: SettingsApi,
  setForm: (form: DrawerSettingsForm) => void,
  setMessage: (msg: string | null) => void,
) {
  useEffect(() => {
    let current = true;
    settings.readSettings().then(
      (read) => current && setForm(drawerFormOf(read)),
      (failure) => current && setMessage(errorMessage(failure)),
    );
    return () => {
      current = false;
    };
  }, [settings, setForm, setMessage]);
}

function useDrawerSettingsForm(settings: SettingsApi) {
  const merge = useMergeAppSettings();
  const [form, setForm] = useState(() => drawerFormOf(DEFAULT_APP_SETTINGS));
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useDrawerSettingsLoad(settings, setForm, setMessage);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const parsed = parseDrawerSettings(form);
    if (!parsed.ok) return setMessage(parsed.error);
    setBusy(true);
    try {
      merge(await settings.saveSettings(parsed.value));
      setMessage('Gaveta salva.');
    } catch (failure) {
      setMessage(errorMessage(failure));
    } finally {
      setBusy(false);
    }
  };
  return { form, setForm, message, busy, submit };
}

/**
 * Cadastros → Pagamentos → Gaveta: troco inicial padrão e tolerância no dinheiro.
 *
 * @example <DrawerSettingsTab settings={settings} />
 */
export function DrawerSettingsTab({ settings }: { settings: SettingsApi }) {
  const { form, setForm, message, busy, submit } =
    useDrawerSettingsForm(settings);
  return (
    <form className="card drawer-settings" onSubmit={submit}>
      <fieldset>
        <legend>Gaveta do caixa</legend>
        <TextField
          label="Troco inicial padrão"
          inputMode="decimal"
          value={form.openingDefault}
          onChange={(openingDefault) => setForm({ ...form, openingDefault })}
        />
        <p className="hint">O caixa confere e corrige na abertura.</p>
        <TextField
          label="Diferença aceita no dinheiro"
          inputMode="decimal"
          value={form.cashTolerance}
          onChange={(cashTolerance) => setForm({ ...form, cashTolerance })}
        />
        <p className="hint">
          Sobra ou falta até este valor conta como bateu. PIX e maquininha
          precisam bater exato.
        </p>
      </fieldset>
      <button type="submit" className="button" disabled={busy} aria-busy={busy}>
        <Check aria-hidden />
        Salvar gaveta
      </button>
      {message && (
        <p className="hint" role="status">
          {message}
        </p>
      )}
    </form>
  );
}
