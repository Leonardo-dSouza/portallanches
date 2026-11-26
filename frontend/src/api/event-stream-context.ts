import { createContext, useContext } from 'react';
import type { EventStreamOpener } from './event-stream';

export const EventStreamContext = createContext<EventStreamOpener | null>(null);

/**
 * Fornece a função de abertura de stream SSE configurada na raiz da aplicação.
 *
 * @example const open = useEventStreamOpener();
 */
export function useEventStreamOpener(): EventStreamOpener {
  const opener = useContext(EventStreamContext);
  if (!opener) {
    throw new Error(
      'useEventStreamOpener usado fora de <EventStreamContext.Provider>: esperado EventStreamOpener, recebido null',
    );
  }
  return opener;
}
