import {
  Inject,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { NfcePageSource } from './nfce-page-source.js';

export const NFCE_FETCH = Symbol('NFCE_FETCH');
export const NFCE_LOG = Symbol('NFCE_LOG');

const SEFAZ_SP_QUERY_URL =
  'https://www.nfce.fazenda.sp.gov.br/NFCeConsultaPublica/Paginas/ConsultaQRCode.aspx';
// A SEFAZ responde em ~0,1 s; 10 s cobre a internet ruim da loja sem prender o caixa.
const TIMEOUT_MS = 10_000;

export interface NfceFetchInit {
  signal: AbortSignal;
}

/** O pedaço da resposta do `fetch` que a consulta usa. */
export interface NfceHttpResponse {
  ok: boolean;
  status: number;
  text(): Promise<string>;
}

/** O `fetch` global do Node, visto pela consulta (injetado para os testes). */
export type NfceFetch = (
  url: string,
  init: NfceFetchInit,
) => Promise<NfceHttpResponse>;

export interface NfceLogEntry {
  event: 'nfce_fetch_failed';
  accessKey: string;
  reason: string;
}

/** Saída do log estruturado (JSON no console da produção). */
export type NfceLog = (entry: NfceLogEntry) => void;

/**
 * Busca a página na consulta pública da SEFAZ-SP. Só o `p` validado entra na URL: o host é
 * fixo, então o link colado no caixa nunca é buscado (SSRF).
 *
 * @example await source.fetchPage('3526…|3|1') // '<!DOCTYPE html>…'
 */
@Injectable()
export class HttpNfcePageSource implements NfcePageSource {
  constructor(
    @Inject(NFCE_FETCH) private readonly fetchUrl: NfceFetch,
    @Inject(NFCE_LOG) private readonly log: NfceLog,
  ) {}

  async fetchPage(queryParam: string): Promise<string> {
    const url = `${SEFAZ_SP_QUERY_URL}?p=${queryParam}`;
    const signal = AbortSignal.timeout(TIMEOUT_MS);
    const failOn = (error: unknown): never =>
      this.fail(queryParam, describeError(error));
    const response = await this.fetchUrl(url, { signal }).catch(failOn);
    if (!response.ok) return this.fail(queryParam, `HTTP ${response.status}`);
    // O tempo-limite e a queda da internet também podem pegar no meio do corpo.
    return response.text().catch(failOn);
  }

  private fail(queryParam: string, reason: string): never {
    const accessKey = queryParam.split('|')[0];
    this.log({ event: 'nfce_fetch_failed', accessKey, reason });
    throw new ServiceUnavailableException(
      `A SEFAZ não respondeu (${reason}): lance o gasto à mão ou tente de novo`,
    );
  }
}

function describeError(error: unknown): string {
  return error instanceof Error
    ? `${error.name}: ${error.message}`
    : String(error);
}
