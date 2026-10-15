import type { AppSettings, SettingsReader } from './app-settings.service.js';
import { DEFAULT_CASH_SHORTCUTS } from './cash-shortcuts.js';

/** Configuração fixa dos testes: os padrões, com o saldo e a trava do caixa mudáveis. */
export class FixedSettings implements SettingsReader {
  lowStockWarning = 6;
  cashierFixMinutes = 15;

  async read(): Promise<AppSettings> {
    return {
      lowStockWarning: this.lowStockWarning,
      artisanalMark: 'Art',
      ticketAbbreviations: [],
      cashShortcuts: DEFAULT_CASH_SHORTCUTS,
      cashierFixMinutes: this.cashierFixMinutes,
    };
  }
}
