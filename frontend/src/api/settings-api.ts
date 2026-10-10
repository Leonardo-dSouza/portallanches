import type { ApiClient } from './api-client';
import type { AppSettings } from './types';

/** Configurações gerais: leitura para qualquer logado; gravar só o admin. */
export interface SettingsApi {
  readSettings(): Promise<AppSettings>;
  saveSettings(settings: AppSettings): Promise<AppSettings>;
}

/** @example const { lowStockWarning } = await createSettingsApi(api).readSettings(); */
export function createSettingsApi(api: ApiClient): SettingsApi {
  return {
    readSettings: () => api.request('GET', '/settings'),
    saveSettings: (settings) => api.request('PUT', '/settings', settings),
  };
}
