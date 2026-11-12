import type { AppSettings, SettingsReader } from './app-settings.service.js';
import { DEFAULT_CASH_SHORTCUTS } from './cash-shortcuts.js';
import {
  DEFAULT_DRAWER_CASH_TOLERANCE,
  DEFAULT_DRAWER_OPENING_DEFAULT,
} from './drawer-settings.js';
import { DEFAULT_PAYMENT_KEY_LAYOUT } from './payment-key-layout.js';

/** Configuração fixa dos testes: os padrões, com o saldo e a trava do caixa mudáveis. */
export class FixedSettings implements SettingsReader {
  lowStockWarning = 6;
  cashierFixMinutes = 15;
  drawerCashTolerance = DEFAULT_DRAWER_CASH_TOLERANCE;

  async read(): Promise<AppSettings> {
    return {
      lowStockWarning: this.lowStockWarning,
      artisanalMark: 'Art',
      ticketAbbreviations: [],
      cashShortcuts: DEFAULT_CASH_SHORTCUTS,
      cashierFixMinutes: this.cashierFixMinutes,
      paymentKeyLayout: DEFAULT_PAYMENT_KEY_LAYOUT,
      drawerOpeningDefault: DEFAULT_DRAWER_OPENING_DEFAULT,
      drawerCashTolerance: this.drawerCashTolerance,
    };
  }
}
