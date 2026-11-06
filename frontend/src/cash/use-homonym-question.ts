import { useState } from 'react';
import type { HomonymAnswer } from './homonym-address';

/** O que a janela do homônimo mostra (S5-11). */
export interface HomonymView {
  name: string;
  /** null = cadastro sem endereço (cliente só do fiado do balcão). */
  recordAddress: string | null;
  typedAddress: string;
}

export interface HomonymQuestion {
  /** O que a janela mostra; null = fechada. */
  view: HomonymView | null;
  /** Abre a janela; a resposta segue o salvar que ficou parado. */
  ask(view: HomonymView, onAnswer: (answer: HomonymAnswer) => void): void;
  /** Fecha e segue o salvar com a resposta. */
  answer(answer: HomonymAnswer): void;
  /** Fecha sem salvar: o caixa volta ao formulário. */
  cancel(): void;
}

interface PendingQuestion {
  view: HomonymView;
  onAnswer(answer: HomonymAnswer): void;
}

/**
 * A pergunta "mudou de endereço ou é outra pessoa?" ao salvar o cliente achado pelo nome.
 *
 * @example const homonym = useHomonymQuestion(); homonym.ask(view, (answer) => void save(answer));
 */
export function useHomonymQuestion(): HomonymQuestion {
  const [pending, setPending] = useState<PendingQuestion | null>(null);
  const answer = (choice: HomonymAnswer) => {
    setPending(null);
    pending?.onAnswer(choice);
  };
  return {
    view: pending?.view ?? null,
    ask: (view, onAnswer) => setPending({ view, onAnswer }),
    answer,
    cancel: () => setPending(null),
  };
}
