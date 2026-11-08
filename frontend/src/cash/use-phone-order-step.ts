import { useState } from 'react';
import type { Order } from '../api/types';

/** Passo ativo na interface de garçom do celular. */
export type PhoneOrderStep = 'build' | 'close';

/**
 * Controla o passo atual da comanda no celular (2026-11-05):
 * editar abre direto em 'close'; novo pedido e acrescentar item começam em 'build'.
 * Ajusta o passo durante o render se a prop `editing` ou `adding` mudar.
 *
 * @example const { step, goToClose, goToBuild } = usePhoneOrderStep(editing, adding);
 */
export function usePhoneOrderStep(
  editing: Order | null,
  adding: Order | null = null,
): {
  step: PhoneOrderStep;
  goToClose(): void;
  goToBuild(): void;
} {
  const currentKey = adding
    ? `add-${adding.id}`
    : editing
      ? `edit-${editing.id}`
      : null;
  const isEdit = editing !== null && !adding;
  const [currentId, setCurrentId] = useState<string | null>(currentKey);
  const [step, setStep] = useState<PhoneOrderStep>(isEdit ? 'close' : 'build');

  if (currentKey !== currentId) {
    setCurrentId(currentKey);
    setStep(isEdit ? 'close' : 'build');
  }

  return {
    step,
    goToClose: () => setStep('close'),
    goToBuild: () => setStep('build'),
  };
}
