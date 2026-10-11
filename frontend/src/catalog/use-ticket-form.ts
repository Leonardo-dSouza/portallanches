import { useState, type FormEvent } from 'react';
import { errorMessage } from '../api/error-message';
import type { SettingsApi } from '../api/settings-api';
import type { AppSettings, TicketAbbreviation } from '../api/types';
import {
  ticketSettingsOf,
  useReplaceTicketSettings,
} from '../print/ticket-settings';
import { replaceRowField, withoutRow } from './row-list';
import { parseTicketForm } from './ticket-settings-values';

export interface TicketFormState {
  mark: string;
  setMark(value: string): void;
  rows: TicketAbbreviation[];
  setRow(index: number, field: keyof TicketAbbreviation, value: string): void;
  addRow(): void;
  removeRow(index: number): void;
  message: string | null;
  busy: boolean;
  submit(event: FormEvent): Promise<void>;
}

/** Grava e, se der certo, mostra o que o servidor guardou e troca a marca deste PC. */
function useTicketSave(settings: SettingsApi, show: (s: AppSettings) => void) {
  const replace = useReplaceTicketSettings();
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const save = async (mark: string, rows: TicketAbbreviation[]) => {
    const parsed = parseTicketForm(mark, rows);
    if (!parsed.ok) return setMessage(parsed.error);
    setBusy(true);
    try {
      const saved = await settings.saveSettings(parsed.value);
      show(saved);
      replace(ticketSettingsOf(saved));
      setMessage('Comanda salva.');
    } catch (failure) {
      setMessage(errorMessage(failure));
    } finally {
      setBusy(false);
    }
  };
  return { message, busy, save };
}

/**
 * Formulário da aba Comanda: a marca do artesanal e as abreviações, num Salvar só. Este PC
 * passa a usar na hora; os outros, ao recarregar a página.
 *
 * @example const form = useTicketForm(createSettingsApi(api), storedSettings);
 */
export function useTicketForm(
  settings: SettingsApi,
  stored: AppSettings,
): TicketFormState {
  const [mark, setMark] = useState(stored.artisanalMark);
  const [rows, setRows] = useState(stored.ticketAbbreviations);
  const show = (saved: AppSettings) => {
    setMark(saved.artisanalMark);
    setRows(saved.ticketAbbreviations);
  };
  const { message, busy, save } = useTicketSave(settings, show);
  return {
    mark,
    setMark,
    rows,
    setRow: (index, field, value) =>
      setRows(replaceRowField(rows, index, field, value)),
    addRow: () => setRows([...rows, { from: '', to: '' }]),
    removeRow: (index) => setRows(withoutRow(rows, index)),
    message,
    busy,
    submit: async (event) => {
      event.preventDefault();
      await save(mark, rows);
    },
  };
}
