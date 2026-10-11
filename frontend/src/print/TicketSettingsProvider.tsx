import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type { SettingsApi } from '../api/settings-api';
import {
  DEFAULT_TICKET_SETTINGS,
  TicketSettingsContext,
  ticketSettingsOf,
  type TicketSettings,
} from './ticket-settings';

interface TicketSettingsProviderProps {
  settings: SettingsApi;
  children: ReactNode;
}

/**
 * Lê a marca do artesanal e as abreviações uma vez ao entrar e entrega às telas e à comanda.
 * Sem conseguir ler, fica o padrão: a comanda nunca deixa de sair por causa disso.
 *
 * @example <TicketSettingsProvider settings={createSettingsApi(api)}>…</TicketSettingsProvider>
 */
export function TicketSettingsProvider({
  settings,
  children,
}: TicketSettingsProviderProps) {
  const [current, setCurrent] = useState<TicketSettings>(
    DEFAULT_TICKET_SETTINGS,
  );
  useEffect(() => {
    let active = true;
    settings.readSettings().then(
      (read) => active && setCurrent(ticketSettingsOf(read)),
      () => undefined,
    );
    return () => {
      active = false;
    };
  }, [settings]);
  const value = useMemo(
    () => ({ settings: current, replace: setCurrent }),
    [current],
  );
  return (
    <TicketSettingsContext.Provider value={value}>
      {children}
    </TicketSettingsContext.Provider>
  );
}
