import type { EventStreamOpener, SseEvent } from '../api/event-stream';

/**
 * Leitor de stream SSE para testes de componentes que usam o caixa ao vivo.
 *
 * @example const fakeStream = new FakeEventStream();
 */
export class FakeEventStream {
  readonly openedPaths: string[] = [];
  private currentListener: ((event: SseEvent) => void) | null = null;

  readonly opener: EventStreamOpener = (path, onEvent, signal) => {
    this.openedPaths.push(path);
    this.currentListener = onEvent;
    return new Promise<void>((resolve) => {
      signal.addEventListener('abort', () => resolve(), { once: true });
    });
  };

  emit(type: string, data = '{}'): void {
    if (this.currentListener) {
      this.currentListener({ type, data });
    }
  }
}
