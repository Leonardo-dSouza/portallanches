import { addonPreview, notePreview } from './addon-preview';
import type { ItemCommand } from './item-command';
import { findByNumber, searchMenu, type MenuItem } from './menu-lookup';
import type { DraftLine } from './order-lines';

/** O que aparece embaixo do campo Item enquanto o caixa digita. */
export type ItemPreview =
  | { kind: 'idle' }
  | { kind: 'adjust'; delta: 1 | -1 }
  | { kind: 'item'; item: MenuItem; quantity: number }
  | { kind: 'results'; items: MenuItem[]; active: number; quantity: number }
  /** Adicionais aceitos pela última linha (`line`) que casam com o "+texto". */
  | { kind: 'addons'; items: MenuItem[]; active: number; line: DraftLine }
  | { kind: 'note'; note: string; line: DraftLine }
  | { kind: 'problem'; message: string };

const clampIndex = (index: number, length: number) =>
  Math.max(0, Math.min(index, length - 1));

function numberPreview(
  command: Extract<ItemCommand, { kind: 'number' }>,
  menu: MenuItem[],
): ItemPreview {
  const item = findByNumber(menu, command.number, command.artisanal);
  if (item) return { kind: 'item', item, quantity: command.quantity };
  return {
    kind: 'problem',
    message: `O ${command.number} não está no cardápio (ou está sem preço)`,
  };
}

function searchPreview(
  command: Extract<ItemCommand, { kind: 'search' }>,
  menu: MenuItem[],
  active: number,
): ItemPreview {
  const items = searchMenu(menu, command.query);
  if (items.length === 0)
    return { kind: 'problem', message: `Nenhum item com "${command.query}"` };
  const index = clampIndex(active, items.length);
  return { kind: 'results', items, active: index, quantity: command.quantity };
}

/**
 * Prévia do campo Item: o item do número, a lista da busca (com o escolhido pelas setas), os
 * adicionais ou a observação da última linha, ou o aviso do que está errado, antes do Enter.
 *
 * @example previewOf(parseItemCommand('9.'), menu, 0) // { kind: 'item', item: X Salada artesanal, quantity: 1 }
 */
export function previewOf(
  command: ItemCommand,
  menu: MenuItem[],
  active: number,
  lastLine?: DraftLine,
): ItemPreview {
  if (command.kind === 'empty') return { kind: 'idle' };
  if (command.kind === 'adjust') return command;
  if (command.kind === 'invalid')
    return { kind: 'problem', message: command.error };
  if (command.kind === 'number') return numberPreview(command, menu);
  if (command.kind === 'addon')
    return addonPreview(command, menu, active, lastLine);
  if (command.kind === 'note') return notePreview(command, lastLine);
  return searchPreview(command, menu, active);
}

/** Item que o Enter adiciona: o do número ou o marcado na lista (da busca ou dos adicionais). */
export function chosenItem(preview: ItemPreview): MenuItem | null {
  if (preview.kind === 'item') return preview.item;
  if (preview.kind === 'results' || preview.kind === 'addons')
    return preview.items[preview.active];
  return null;
}

/** Opções clicáveis embaixo do campo, com a escolhida pelas setas e a quantidade digitada. */
export interface PreviewOptions {
  items: MenuItem[];
  active: number;
  quantity: number;
}

/**
 * Lista clicável da prévia: o item achado pelo número vira uma opção só, igual à busca
 * (pedido do usuário, 2026-10-09: digitar "9" e clicar não fazia nada). Null = nada a escolher.
 *
 * @example optionsOf(previewOf(parseItemCommand('2*9'), menu, 0)) // { items: [X Salada], active: 0, quantity: 2 }
 */
export function optionsOf(preview: ItemPreview): PreviewOptions | null {
  if (preview.kind === 'item')
    return { items: [preview.item], active: 0, quantity: preview.quantity };
  if (preview.kind === 'results') {
    const { items, active, quantity } = preview;
    return { items, active, quantity };
  }
  if (preview.kind === 'addons')
    return { items: preview.items, active: preview.active, quantity: 1 };
  return null;
}
