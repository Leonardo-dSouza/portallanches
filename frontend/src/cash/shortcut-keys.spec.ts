import { describe, expect, it } from 'vitest';
import { matchesShortcut, type ShortcutPress } from './shortcut-keys';

const press = (key: string, mods: Partial<ShortcutPress> = {}) => ({
  key,
  ctrlKey: false,
  shiftKey: false,
  altKey: false,
  metaKey: false,
  ...mods,
});

describe('matchesShortcut', () => {
  it('tecla de função sozinha', () => {
    expect(matchesShortcut(press('F9'), 'F9')).toBe(true);
    expect(matchesShortcut(press('F8'), 'F9')).toBe(false);
    expect(matchesShortcut(press('F9', { ctrlKey: true }), 'F9')).toBe(false);
  });

  it('combinação: os modificadores precisam bater', () => {
    expect(
      matchesShortcut(press('Enter', { ctrlKey: true }), 'Ctrl+Enter'),
    ).toBe(true);
    expect(matchesShortcut(press('Enter'), 'Ctrl+Enter')).toBe(false);
    expect(
      matchesShortcut(press('Enter', { shiftKey: true }), 'Ctrl+Enter'),
    ).toBe(false);
    expect(
      matchesShortcut(press('Enter', { shiftKey: true }), 'Shift+Enter'),
    ).toBe(true);
  });

  it('Alt ou a tecla do Windows nunca contam como atalho', () => {
    expect(matchesShortcut(press('F9', { altKey: true }), 'F9')).toBe(false);
    expect(matchesShortcut(press('Insert', { metaKey: true }), 'Insert')).toBe(
      false,
    );
  });
});
