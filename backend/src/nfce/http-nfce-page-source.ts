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
// Recusa do firewall da SEFAZ (desde 2026-10-30): HTTP 200 com esta página de 245 bytes, no lugar
// da nota. Sem esta conferência ela virava "não achou a nota", o que manda conferir a chave à toa.
const FIREWALL_REJECTION = /<title>\s*Request Rejected\s*<\/title>/i;

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
    const page = await response.text().catch(failOn);
    if (FIREWALL_REJECTION.test(page))
      return this.fail(queryParam, 'consulta recusada pelo firewall');
    return page;
  }

  private fail(queryParam: string, reason: string): never {
    const accessKey = queryParam.split('|')[0];
    this.log({ event: 'nfce_fetch_failed', accessKey, reason });
    throw new ServiceUnavailableException(
      `A SEFAZ não respondeu (${reason}): importe o HTML da nota, lance o gasto à mão ou tente de novo`,
    );
  }
}

function describeError(error: unknown): string {
  if (!(error instanceof Error)) return String(error);
  const text = `${error.name}: ${error.message}`;
  const code = causeCode(error);
  return code === null ? text : `${text} (${code})`;
}

/** O `fetch` do Node esconde o motivo da queda em `cause` ("fetch failed" não diz nada). */
function causeCode({ cause }: Error): string | null {
  if (typeof cause !== 'object' || cause === null) return null;
  return 'code' in cause ? String(cause.code) : null;
}
