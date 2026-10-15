import type { AppSettings, CashShortcuts } from '../api/types';
import type { Parsed } from './catalog-values';

/** Nome de cada atalho na tela (e nas mensagens de tecla repetida). */
export const SHORTCUT_LABELS: Record<keyof CashShortcuts, string> = {
  save: 'Salvar pedido',
  toggleType: 'Trocar Balcão/Entrega',
  addons: 'Adicionais da última linha',
  clearAll: 'Limpar tudo',
};

/** O mesmo limite do backend (`cashierFixMinutes`, 0 a 120). */
const MAX_FIX_MINUTES = 120;

export interface CashierSettingsForm {
  shortcuts: CashShortcuts;
  fixMinutes: string;
}

export type CashierSettings = Pick<
  AppSettings,
  'cashShortcuts' | 'cashierFixMinutes'
>;

const ACTIONS = Object.keys(SHORTCUT_LABELS) as (keyof CashShortcuts)[];

function repeatedKeyError(shortcuts: CashShortcuts): string | null {
  for (const [index, action] of ACTIONS.entries()) {
    const other = ACTIONS.slice(0, index).find(
      (before) => shortcuts[before] === shortcuts[action],
    );
    if (other)
      return `A tecla ${shortcuts[action]} está em "${SHORTCUT_LABELS[other]}" e em "${SHORTCUT_LABELS[action]}": esperado uma tecla diferente para cada ação`;
  }
  return null;
}

function emptyKeyError(shortcuts: CashShortcuts): string | null {
  const empty = ACTIONS.find((action) => shortcuts[action] === '');
  return empty ? `Escolha a tecla de "${SHORTCUT_LABELS[empty]}"` : null;
}

/**
 * Aba Caixa de Cadastros: uma tecla por atalho, sem repetir, e a trava em minutos.
 *
 * @example parseCashierSettings({ shortcuts, fixMinutes: '15' }) // { ok: true, value: { …, cashierFixMinutes: 15 } }
 */
export function parseCashierSettings(
  form: CashierSettingsForm,
): Parsed<CashierSettings> {
  const keyError =
    emptyKeyError(form.shortcuts) ?? repeatedKeyError(form.shortcuts);
  if (keyError) return { ok: false, error: keyError };
  const typed = form.fixMinutes.trim();
  const minutes = Number(typed);
  if (!/^\d{1,3}$/.test(typed) || minutes > MAX_FIX_MINUTES)
    return {
      ok: false,
      error: `Minutos inválidos "${form.fixMinutes}": esperado número inteiro de 0 a ${MAX_FIX_MINUTES} (0 = sempre pedir a senha do admin)`,
    };
  return {
    ok: true,
    value: { cashShortcuts: form.shortcuts, cashierFixMinutes: minutes },
  };
}
