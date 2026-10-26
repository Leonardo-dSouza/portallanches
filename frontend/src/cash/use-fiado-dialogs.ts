import { useState } from 'react';
import type { FiadoTarget } from './fiado-labels';

export interface FiadoDialogsState {
  receiving: FiadoTarget | null;
  rescheduling: FiadoTarget | null;
  receive(target: FiadoTarget): void;
  reschedule(target: FiadoTarget): void;
  close(): void;
}

/**
 * Qual janela do fiado está aberta (Receber ou Remarcar) e para qual pedido; uma por vez.
 *
 * @example const fiado = useFiadoDialogs(); fiado.receive(target);
 */
export function useFiadoDialogs(): FiadoDialogsState {
  const [receiving, setReceiving] = useState<FiadoTarget | null>(null);
  const [rescheduling, setRescheduling] = useState<FiadoTarget | null>(null);
  const close = () => {
    setReceiving(null);
    setRescheduling(null);
  };
  return {
    receiving,
    rescheduling,
    receive: (target) => {
      close();
      setReceiving(target);
    },
    reschedule: (target) => {
      close();
      setRescheduling(target);
    },
    close,
  };
}
