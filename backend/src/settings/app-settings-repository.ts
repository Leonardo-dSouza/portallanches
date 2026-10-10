export const APP_SETTINGS_REPOSITORY = Symbol('APP_SETTINGS_REPOSITORY');

/** Tabela `app_settings`: chave → valor em texto. */
export interface AppSettingsRepository {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
}
