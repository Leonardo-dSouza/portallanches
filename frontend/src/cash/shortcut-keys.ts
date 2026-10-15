/**
 * Teclas que o admin pode escolher para os atalhos da comanda: espelha `ALLOWED_SHORTCUTS` do
 * backend (`settings/cash-shortcuts.ts`), que é quem recusa as outras.
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

/** O que o atalho precisa saber de um `keydown` (o do React e o do DOM servem). */
export interface ShortcutPress {
  key: string;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  metaKey: boolean;
}

/**
 * Se a tecla apertada é o atalho escolhido ("F9", "Ctrl+Enter"): os modificadores precisam
 * bater exatamente, para o Enter puro do campo Item não virar "salvar".
 *
 * @example matchesShortcut({ key: 'Enter', ctrlKey: true, shiftKey: false, altKey: false, metaKey: false }, 'Ctrl+Enter') // true
 */
export function matchesShortcut(
  press: ShortcutPress,
  shortcut: string,
): boolean {
  const parts = shortcut.split('+');
  return (
    press.key === parts.at(-1) &&
    press.ctrlKey === parts.includes('Ctrl') &&
    press.shiftKey === parts.includes('Shift') &&
    !press.altKey &&
    !press.metaKey
  );
}
