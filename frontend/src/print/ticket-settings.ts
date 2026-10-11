import { createContext, useContext } from 'react';
import type { AppSettings } from '../api/types';

/** O que a tela e a comanda precisam das configurações (Cadastros → Comanda). */
export type TicketSettings = Pick<
  AppSettings,
  'artisanalMark' | 'ticketAbbreviations'
>;

/** O mesmo padrão do backend: "Art" (pedido do usuário, 2026-10-11) e nenhuma abreviação. */
export const DEFAULT_TICKET_SETTINGS: TicketSettings = {
  artisanalMark: 'Art',
  ticketAbbreviations: [],
};

export interface TicketSettingsState {
  settings: TicketSettings;
  /** A aba Comanda troca na hora para este PC; os outros pegam ao recarregar. */
  replace(next: TicketSettings): void;
}

export const TicketSettingsContext = createContext<TicketSettingsState>({
  settings: DEFAULT_TICKET_SETTINGS,
  replace: () => undefined,
});

/** @example const { artisanalMark } = useTicketSettings(); */
export function useTicketSettings(): TicketSettings {
  return useContext(TicketSettingsContext).settings;
}

/** @example useReplaceTicketSettings()({ artisanalMark: 'Art', ticketAbbreviations: [] }) */
export function useReplaceTicketSettings(): (next: TicketSettings) => void {
  return useContext(TicketSettingsContext).replace;
}

/**
 * Só a parte da comanda de uma resposta do `/settings`.
 *
 * @example ticketSettingsOf(await api.readSettings()).artisanalMark // 'Art'
 */
export function ticketSettingsOf(settings: AppSettings): TicketSettings {
  return {
    artisanalMark: settings.artisanalMark,
    ticketAbbreviations: settings.ticketAbbreviations,
  };
}
