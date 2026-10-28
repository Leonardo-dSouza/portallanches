import { moneyToCents } from '../api/money';
import type { FiadoTarget } from './fiado-labels';

/** As teclas do fiado no rodapé da janela do pedido (2026-10-27). */
export interface FiadoDetailActions {
  onReceive(): void;
  onReschedule(): void;
}

/** Os passos que as teclas abrem (o `useFiadoDialogs` da lista ou da aba Fiado). */
interface FiadoSteps {
  receive(target: FiadoTarget): void;
  reschedule(target: FiadoTarget): void;
}

/**
 * Receber pagamento e Reagendar pagamento na janela do pedido: fecham a janela e abrem a do
 * passo. Sem nada a pagar (ou fora do fiado), nenhuma tecla.
 *
 * @example fiadoDetailActions(target, dialogs, () => setViewing(null))?.onReceive();
 */
export function fiadoDetailActions(
  target: FiadoTarget | null,
  steps: FiadoSteps,
  close: () => void,
): FiadoDetailActions | undefined {
  if (!target || moneyToCents(target.remaining) <= 0) return undefined;
  return {
    onReceive: () => {
      close();
      steps.receive(target);
    },
    onReschedule: () => {
      close();
      steps.reschedule(target);
    },
  };
}
