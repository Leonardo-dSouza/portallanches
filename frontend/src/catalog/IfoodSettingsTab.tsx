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
  ifoodFormOf,
  parseIfoodSettings,
  type IfoodSettingsForm,
} from './ifood-settings-values';

function useIfoodSettingsLoad(
  settings: SettingsApi,
  setForm: (form: IfoodSettingsForm) => void,
  setMessage: (msg: string | null) => void,
) {
  useEffect(() => {
    let current = true;
    settings.readSettings().then(
      (read) => current && setForm(ifoodFormOf(read)),
      (failure) => current && setMessage(errorMessage(failure)),
    );
    return () => {
      current = false;
    };
  }, [settings, setForm, setMessage]);
}

function useIfoodSettingsForm(settings: SettingsApi) {
  const merge = useMergeAppSettings();
  const [form, setForm] = useState(() => ifoodFormOf(DEFAULT_APP_SETTINGS));
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useIfoodSettingsLoad(settings, setForm, setMessage);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const parsed = parseIfoodSettings(form);
    if (!parsed.ok) return setMessage(parsed.error);
    setBusy(true);
    try {
      merge(await settings.saveSettings(parsed.value));
      setMessage('iFood salvo.');
    } catch (failure) {
      setMessage(errorMessage(failure));
    } finally {
      setBusy(false);
    }
  };

  return { form, setForm, message, busy, submit };
}

/**
 * Cadastros → Cardápio → iFood: margem de lucro e comissão do canal para o PV sugerido.
 *
 * @example <IfoodSettingsTab settings={settings} />
 */
export function IfoodSettingsTab({ settings }: { settings: SettingsApi }) {
  const { form, setForm, message, busy, submit } =
    useIfoodSettingsForm(settings);
  return (
    <form className="card drawer-settings ifood-settings" onSubmit={submit}>
      <fieldset>
        <legend>iFood</legend>
        <TextField
          label="Lucro no iFood %"
          inputMode="decimal"
          value={form.profitPercent}
          onChange={(profitPercent) => setForm({ ...form, profitPercent })}
        />
        <TextField
          label="Comissão do iFood %"
          inputMode="decimal"
          value={form.commissionPercent}
          onChange={(commissionPercent) =>
            setForm({ ...form, commissionPercent })
          }
        />
        <p className="hint">
          O PV iFood da área Custos = CMV ÷ (1 − custo fixo da categoria − lucro
          no iFood) ÷ (1 − comissão). Só cálculo: nada é enviado ao iFood.
        </p>
      </fieldset>
      <button type="submit" className="button" disabled={busy} aria-busy={busy}>
        <Check aria-hidden />
        Salvar iFood
      </button>
      {message && (
        <p className="hint" role="status">
          {message}
        </p>
      )}
    </form>
  );
}
