import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { SettingsApi } from '../api/settings-api';
import type { AppSettings } from '../api/types';
import {
  AppSettingsContext,
  DEFAULT_APP_SETTINGS,
} from './app-settings-context';

interface AppSettingsProviderProps {
  settings: SettingsApi;
  children: ReactNode;
}

/**
 * Lê as configurações uma vez ao entrar (comanda, atalhos, trava do caixa) e entrega às telas.
 * Sem conseguir ler, fica o padrão: a comanda nunca deixa de sair nem o caixa de salvar.
 *
 * @example <AppSettingsProvider settings={createSettingsApi(api)}>…</AppSettingsProvider>
 */
export function AppSettingsProvider({
  settings,
  children,
}: AppSettingsProviderProps) {
  const [current, setCurrent] = useState<AppSettings>(DEFAULT_APP_SETTINGS);
  useEffect(() => {
    let active = true;
    settings.readSettings().then(
      (read) => active && setCurrent(read),
      () => undefined,
    );
    return () => {
      active = false;
    };
  }, [settings]);
  const merge = useCallback(
    (changes: Partial<AppSettings>) =>
      setCurrent((before) => ({ ...before, ...changes })),
    [],
  );
  const value = useMemo(() => ({ settings: current, merge }), [current, merge]);
  return (
    <AppSettingsContext.Provider value={value}>
      {children}
    </AppSettingsContext.Provider>
  );
}
