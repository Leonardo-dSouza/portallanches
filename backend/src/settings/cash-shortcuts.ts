import { BadRequestException } from '@nestjs/common';
import { parseChoice, parseObject } from '../common/input-parsers.js';

/**
 * Teclas que o caixa pode usar como atalho (2026-10-15: o cliente não gostou do Ctrl+Enter).
 * Fora da lista ficam as que o Chrome não larga ou que o caixa usa para digitar: F1 (ajuda),
 * F5 (recarrega), F11 (tela cheia), Home/End (andam no texto), números, Enter, "+", "*", "/".
 */
export const ALLOWED_SHORTCUTS = [
  'F2',
  'F3',
  'F4',
  'F6',
  'F7',
  'F8',
  'F9',
  'F10',
  'F12',
  'Ctrl+Enter',
  'Shift+Enter',
  'Insert',
] as const;

export type ShortcutKey = (typeof ALLOWED_SHORTCUTS)[number];

/** O que tem atalho na comanda; as teclas do pagamento (0 a 4) continuam fixas. */
export interface CashShortcuts {
  save: ShortcutKey;
  toggleType: ShortcutKey;
  addons: ShortcutKey;
  clearAll: ShortcutKey;
}

/** Os de antes de existir a escolha, mais o F8 do "Limpar tudo". */
export const DEFAULT_CASH_SHORTCUTS: CashShortcuts = {
  save: 'Ctrl+Enter',
  toggleType: 'F2',
  addons: 'F4',
  clearAll: 'F8',
};

const ACTIONS = Object.keys(DEFAULT_CASH_SHORTCUTS) as (keyof CashShortcuts)[];

function assertDistinct(shortcuts: CashShortcuts): void {
  const seen = new Map<ShortcutKey, keyof CashShortcuts>();
  for (const action of ACTIONS) {
    const key = shortcuts[action];
    const other = seen.get(key);
    if (other) {
      throw new BadRequestException(
        `Campo "cashShortcuts" inválido: a tecla "${key}" está em ${other} e em ${action}, esperado uma tecla diferente para cada ação`,
      );
    }
    seen.set(key, action);
  }
}

/**
 * Os quatro atalhos, cada um uma tecla da lista e sem repetir.
 *
 * @example parseCashShortcuts({ save: 'F9', toggleType: 'F2', addons: 'F4', clearAll: 'F8' }).save // 'F9'
 */
export function parseCashShortcuts(raw: unknown): CashShortcuts {
  const fields = parseObject(
    raw,
    'atalhos ({ save, toggleType, addons, clearAll })',
  );
  const pick = (action: keyof CashShortcuts) =>
    parseChoice(fields[action], `cashShortcuts.${action}`, ALLOWED_SHORTCUTS);
  const shortcuts: CashShortcuts = {
    save: pick('save'),
    toggleType: pick('toggleType'),
    addons: pick('addons'),
    clearAll: pick('clearAll'),
  };
  assertDistinct(shortcuts);
  return shortcuts;
}

/**
 * Os atalhos gravados em JSON; estragado ou ausente vira o padrão (o caixa nunca fica sem salvar).
 *
 * @example readStoredShortcuts(null).save // 'Ctrl+Enter'
 */
export function readStoredShortcuts(stored: string | null): CashShortcuts {
  if (stored === null) return DEFAULT_CASH_SHORTCUTS;
  try {
    return parseCashShortcuts(JSON.parse(stored));
  } catch {
    return DEFAULT_CASH_SHORTCUTS;
  }
}
