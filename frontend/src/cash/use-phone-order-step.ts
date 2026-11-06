import { useState } from 'react';
import type { Order } from '../api/types';

/** Passo ativo na interface de garçom do celular. */
export type PhoneOrderStep = 'build' | 'close';

/**
 * Controla o passo atual da comanda no celular (2026-11-05):
 * editar abre direto em 'close'; novo pedido começa em 'build'.
 * Ajusta o passo durante o render se a prop `editing` mudar.
 *
 * @example const { step, goToClose, goToBuild } = usePhoneOrderStep(editing);
 */
export function usePhoneOrderStep(editing: Order | null): {
  step: PhoneOrderStep;
  goToClose(): void;
  goToBuild(): void;
} {
  const [currentEditingId, setCurrentEditingId] = useState<number | null>(
    editing?.id ?? null,
  );
  const [step, setStep] = useState<PhoneOrderStep>(
    editing !== null ? 'close' : 'build',
  );

  if ((editing?.id ?? null) !== currentEditingId) {
    setCurrentEditingId(editing?.id ?? null);
    setStep(editing !== null ? 'close' : 'build');
  }

  return {
    step,
    goToClose: () => setStep('close'),
    goToBuild: () => setStep('build'),
  };
}
