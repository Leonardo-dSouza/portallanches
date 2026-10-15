import { createContext, useContext } from 'react';
import type { AppSettings, CashShortcuts } from '../api/types';

/** Os mesmos padrões do backend (`settings/app-settings.service.ts`), para quando a leitura falha. */
export const DEFAULT_APP_SETTINGS: AppSettings = {
  lowStockWarning: 6,
  artisanalMark: 'Art',
  ticketAbbreviations: [],
  cashShortcuts: {
    save: 'Ctrl+Enter',
    toggleType: 'F2',
    addons: 'F4',
    clearAll: 'F8',
  },
  cashierFixMinutes: 15,
};

export interface AppSettingsState {
  settings: AppSettings;
  /** Uma aba de Cadastros salvou: troca na hora neste PC; os outros pegam ao recarregar. */
  merge(changes: Partial<AppSettings>): void;
}

export const AppSettingsContext = createContext<AppSettingsState>({
  settings: DEFAULT_APP_SETTINGS,
  merge: () => undefined,
});

/** @example const { lowStockWarning } = useAppSettings(); */
export function useAppSettings(): AppSettings {
  return useContext(AppSettingsContext).settings;
}

/** @example useMergeAppSettings()({ cashierFixMinutes: 10 }) */
export function useMergeAppSettings(): (changes: Partial<AppSettings>) => void {
  return useContext(AppSettingsContext).merge;
}

/** Teclas de Salvar, Trocar tipo, Adicionais e Limpar tudo (Cadastros → Comanda e ajustes). */
export function useCashShortcuts(): CashShortcuts {
  return useAppSettings().cashShortcuts;
}
