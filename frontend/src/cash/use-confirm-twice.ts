import { useState } from 'react';

export interface ConfirmTwice {
  /** O 1º aperto aconteceu: o próximo executa. */
  armed: boolean;
  press(): void;
  disarm(): void;
}

/**
 * Ação que apaga o que o caixa digitou (Limpar tudo, 2026-10-15): o 1º aperto (botão ou atalho)
 * arma e o 2º executa; qualquer outra tecla desarma.
 *
 * @example const clear = useConfirmTwice(form.clearAll); clear.press(); clear.press();
 */
export function useConfirmTwice(onConfirm: () => void): ConfirmTwice {
  const [armed, setArmed] = useState(false);
  return {
    armed,
    press: () => {
      setArmed(!armed);
      if (armed) onConfirm();
    },
    disarm: () => setArmed(false),
  };
}
