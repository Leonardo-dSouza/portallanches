/**
 * FakeMediaQueryList: substituto nomeado do `window.matchMedia` para testes que precisam
 * controlar o resultado de uma media query sem depender do JSDOM (que não implementa matchMedia).
 */
export class FakeMediaQueryList implements MediaQueryList {
  readonly media: string;
  matches: boolean;

  private listeners: ((event: MediaQueryListEvent) => void)[] = [];

  constructor(media: string, matches: boolean) {
    this.media = media;
    this.matches = matches;
  }

  /** Dispara a mudança de estado e notifica os ouvintes registrados via `addEventListener`. */
  setMatches(next: boolean): void {
    if (next === this.matches) return;
    this.matches = next;
    const event = { matches: next, media: this.media } as MediaQueryListEvent;
    this.listeners.forEach((fn) => fn(event));
  }

  addEventListener(
    _type: string,
    listener: EventListenerOrEventListenerObject,
  ): void {
    if (typeof listener === 'function') {
      this.listeners.push(listener as (event: MediaQueryListEvent) => void);
    } else if (listener && typeof listener.handleEvent === 'function') {
      this.listeners.push((event) => listener.handleEvent(event));
    }
  }

  removeEventListener(
    _type: string,
    listener: EventListenerOrEventListenerObject,
  ): void {
    this.listeners = this.listeners.filter((fn) => fn !== listener);
  }

  /** Não implementado: o FakeMediaQueryList não usa o modelo legado de `addListener`. */
  addListener(): void {}
  removeListener(): void {}
  onchange: ((this: MediaQueryList, ev: MediaQueryListEvent) => void) | null = null;

  dispatchEvent(_event: Event): boolean {
    return false;
  }
}
