import { useMemo } from 'react';
import type { AppSettings } from '../api/types';
import {
  DEFAULT_APP_SETTINGS,
  useAppSettings,
  useMergeAppSettings,
} from '../settings/app-settings-context';

/** O que a tela e a comanda precisam das configurações (Cadastros → Comanda). */
export type TicketSettings = Pick<
  AppSettings,
  'artisanalMark' | 'ticketAbbreviations'
>;

/** O mesmo padrão do backend: "Art" (pedido do usuário, 2026-10-11) e nenhuma abreviação. */
export const DEFAULT_TICKET_SETTINGS: TicketSettings =
  ticketSettingsOf(DEFAULT_APP_SETTINGS);

/** @example const { artisanalMark } = useTicketSettings(); */
export function useTicketSettings(): TicketSettings {
  const settings = useAppSettings();
  return useMemo(() => ticketSettingsOf(settings), [settings]);
}

/** @example useReplaceTicketSettings()({ artisanalMark: 'Art', ticketAbbreviations: [] }) */
export function useReplaceTicketSettings(): (next: TicketSettings) => void {
  return useMergeAppSettings();
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
