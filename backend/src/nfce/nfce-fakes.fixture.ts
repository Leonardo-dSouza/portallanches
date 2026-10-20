import type { NfcePageSource } from './nfce-page-source.js';

/** SEFAZ de mentira: devolve a página que o teste guardou para cada chave e anota as consultas. */
export class FakeNfcePageSource implements NfcePageSource {
  readonly queries: string[] = [];
  private readonly pages = new Map<string, string>();
  private failure: Error | null = null;

  /** Guarda a página que a "SEFAZ" devolve para a chave. */
  serve(accessKey: string, html: string): this {
    this.pages.set(accessKey, html);
    return this;
  }

  /** Faz toda consulta falhar com `error` (SEFAZ fora do ar). */
  failWith(error: Error): this {
    this.failure = error;
    return this;
  }

  async fetchPage(queryParam: string): Promise<string> {
    this.queries.push(queryParam);
    if (this.failure) throw this.failure;
    const html = this.pages.get(queryParam.split('|')[0]);
    if (html === undefined)
      throw new Error(
        `FakeNfcePageSource sem página para ${JSON.stringify(queryParam)}`,
      );
    return html;
  }
}
