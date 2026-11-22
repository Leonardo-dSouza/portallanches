import { Check } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { errorMessage } from '../api/error-message';
import type { SettingsApi } from '../api/settings-api';
import type { AppSettings } from '../api/types';
import { DELIVERY_CODE_PLACEHOLDER } from '../cash/delivery-message';
import {
  DEFAULT_APP_SETTINGS,
  useMergeAppSettings,
} from '../settings/app-settings-context';

/** As duas mensagens do código de entrega, como o `PUT /settings` recebe. */
export type DeliveryCodeMessages = Pick<
  AppSettings,
  'deliveryCodeConfirmMessage' | 'deliveryCodeRouteMessage'
>;

/** @example messagesOf(await settings.readSettings()).deliveryCodeRouteMessage */
function messagesOf(settings: AppSettings): DeliveryCodeMessages {
  return {
    deliveryCodeConfirmMessage: settings.deliveryCodeConfirmMessage,
    deliveryCodeRouteMessage: settings.deliveryCodeRouteMessage,
  };
}

/** Abre com o que está gravado; o padrão só até a leitura chegar. */
function useStoredMessages(
  settings: SettingsApi,
  setForm: (form: DeliveryCodeMessages) => void,
  setMessage: (message: string | null) => void,
) {
  useEffect(() => {
    let current = true;
    settings.readSettings().then(
      (read) => current && setForm(messagesOf(read)),
      (failure) => current && setMessage(errorMessage(failure)),
    );
    return () => {
      current = false;
    };
  }, [settings, setForm, setMessage]);
}

/** Grava as duas e troca na hora neste PC; o backend recusa a confirmação sem [CÓDIGO]. */
function useMessagesForm(settings: SettingsApi) {
  const merge = useMergeAppSettings();
  const [form, setForm] = useState(() => messagesOf(DEFAULT_APP_SETTINGS));
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useStoredMessages(settings, setForm, setMessage);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      const saved = await settings.saveSettings(form);
      merge(messagesOf(saved));
      setForm(messagesOf(saved));
      setMessage('Mensagens salvas.');
    } catch (failure) {
      setMessage(errorMessage(failure));
    } finally {
      setBusy(false);
    }
  };
  return { form, setForm, message, busy, submit };
}

function MessageField(props: {
  label: string;
  value: string;
  onChange(value: string): void;
}) {
  return (
    <label className="field">
      {props.label}
      <textarea
        className="delivery-code-message"
        rows={9}
        maxLength={1000}
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
      />
    </label>
  );
}

/**
 * As mensagens que o caixa copia no pop-up do pedido com código de entrega (2026-11-21): uma ao
 * confirmar e outra quando sai. Fica embaixo da lista de bairros.
 *
 * @example <DeliveryCodeMessagesForm settings={createSettingsApi(api)} />
 */
export function DeliveryCodeMessagesForm({
  settings,
}: {
  settings: SettingsApi;
}) {
  const { form, setForm, message, busy, submit } = useMessagesForm(settings);
  return (
    <form
      className="card delivery-code-messages"
      aria-label="Mensagens do código de entrega"
      onSubmit={submit}
    >
      <h2>Mensagens do código de entrega</h2>
      <p className="hint">
        O caixa copia no pedido e cola no WhatsApp do cliente.{' '}
        {DELIVERY_CODE_PLACEHOLDER} vira os 4 dígitos do pedido; a mensagem ao
        confirmar precisa dele.
      </p>
      <div className="delivery-code-messages-fields">
        <MessageField
          label="Mensagem ao confirmar o pedido"
          value={form.deliveryCodeConfirmMessage}
          onChange={(text) =>
            setForm({ ...form, deliveryCodeConfirmMessage: text })
          }
        />
        <MessageField
          label="Mensagem quando sai para entrega"
          value={form.deliveryCodeRouteMessage}
          onChange={(text) =>
            setForm({ ...form, deliveryCodeRouteMessage: text })
          }
        />
      </div>
      <button type="submit" className="button" disabled={busy} aria-busy={busy}>
        <Check aria-hidden />
        Salvar mensagens
      </button>
      {message && (
        <p className="hint" role="status">
          {message}
        </p>
      )}
    </form>
  );
}
