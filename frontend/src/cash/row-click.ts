import type { MouseEvent } from 'react';

/**
 * Clique na linha abre o pedido; nos botões dela, só o botão age. A lista do caixa e o extrato
 * da aba Fiado (2026-10-27) usam.
 *
 * @example <tr onClick={(event) => openUnlessButton(event, () => onOpen(order))}>
 */
export function openUnlessButton(event: MouseEvent, open: () => void): void {
  if (event.target instanceof Element && event.target.closest('button')) return;
  open();
}
