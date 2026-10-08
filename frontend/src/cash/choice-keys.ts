import type { KeyboardEvent } from 'react';

/**
 * Teclado de um grupo de teclas numeradas: 1 a `count` escolhem, Enter (sem Ctrl) salva.
 * Chamada dentro do `onKeyDown` (e não para criar o handler no render: o React Compiler
 * recusa otimizar quando a função escolhida lê uma ref).
 *
 * @example <fieldset onKeyDown={(event) => pressNumberKey(event, 3, pick, save)}>
 */
export function pressNumberKey(
  event: KeyboardEvent<HTMLFieldSetElement>,
  count: number,
  pick: (index: number) => void,
  submit: () => void,
): void {
  const index = Number(event.key) - 1;
  if (index >= 0 && index < count) {
    event.preventDefault();
    pick(index);
  } else if (event.key === 'Enter' && !event.ctrlKey) {
    event.preventDefault();
    submit();
  }
}

/** Leva o foco à opção marcada do grupo (ou à primeira), para seguir pelo teclado. */
export function focusChoice(group: HTMLElement | null): void {
  group?.querySelector<HTMLInputElement>('input:checked, input')?.focus();
}
