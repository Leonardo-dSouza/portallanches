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
    toggleDining: 'F3',
    addons: 'F4',
    clearAll: 'F8',
  },
  cashierFixMinutes: 15,
  paymentKeyLayout: {
    openAccount: { position: 98, active: true },
    split: { position: 99, active: true },
  },
  drawerOpeningDefault: '30.00',
  drawerCashTolerance: '2.00',
  ifoodProfitPercent: '10',
  ifoodCommissionPercent: '28',
  deliveryCodeConfirmMessage: [
    'Seu pedido da Portal Lanches foi confirmado! ✅',
    '',
    'Para sua segurança, ele tem um código de entrega: *[CÓDIGO]*',
    '',
    'Guarde esse código. Na hora de receber, informe ao motoboy. Ele só entrega o pedido para quem disser o código certo.',
    '',
    'Não passe esse código para outras pessoas.',
  ].join('\n'),
  deliveryCodeRouteMessage: [
    'Seu pedido da Portal Lanches está a caminho! 🛵',
    '',
    'Tenha em mãos o código de entrega: *[CÓDIGO]*',
    '',
    'O motoboy vai pedir esse código para entregar o pedido.',
    '',
    'Obrigado pela preferência!',
  ].join('\n'),
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
