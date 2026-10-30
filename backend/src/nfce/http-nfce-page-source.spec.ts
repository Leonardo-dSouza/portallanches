import { ServiceUnavailableException } from '@nestjs/common';
import {
  HttpNfcePageSource,
  type NfceFetch,
  type NfceFetchInit,
  type NfceHttpResponse,
  type NfceLogEntry,
} from './http-nfce-page-source.js';

const KEY = '35261011222333000181650010000012341123456780';

type FakeReply =
  | { kind: 'page'; status: number; body: string }
  | { kind: 'error'; error: Error }
  | { kind: 'dropped'; error: Error };

/** `fetch` de mentira: guarda as chamadas e responde o que o teste mandou. */
class FakeFetch {
  readonly calls: { url: string; init: NfceFetchInit }[] = [];

  constructor(private readonly reply: FakeReply) {}

  readonly fetch: NfceFetch = async (url, init) => {
    this.calls.push({ url, init });
    const reply = this.reply;
    if (reply.kind === 'error') throw reply.error;
    if (reply.kind === 'dropped')
      return { ok: true, status: 200, text: () => Promise.reject(reply.error) };
    const response: NfceHttpResponse = {
      ok: reply.status >= 200 && reply.status < 300,
      status: reply.status,
      text: async () => reply.body,
    };
    return response;
  };
}

class FakeNfceLog {
  readonly entries: NfceLogEntry[] = [];
  readonly log = (entry: NfceLogEntry): void => {
    this.entries.push(entry);
  };
}

function sourceWith(reply: FakeReply) {
  const fake = new FakeFetch(reply);
  const log = new FakeNfceLog();
  return { fake, log, source: new HttpNfcePageSource(fake.fetch, log.log) };
}

describe('HttpNfcePageSource', () => {
  it('consulta sempre o host fixo da SEFAZ-SP com o p recebido', async () => {
    const { fake, source } = sourceWith({
      kind: 'page',
      status: 200,
      body: '<html/>',
    });
    await expect(source.fetchPage(`${KEY}|3|1`)).resolves.toBe('<html/>');
    expect(fake.calls[0].url).toBe(
      `https://www.nfce.fazenda.sp.gov.br/NFCeConsultaPublica/Paginas/ConsultaQRCode.aspx?p=${KEY}|3|1`,
    );
  });

  it('manda um sinal de tempo-limite para a consulta não prender o caixa', async () => {
    const { fake, source } = sourceWith({
      kind: 'page',
      status: 200,
      body: '',
    });
    await source.fetchPage(`${KEY}|3|1`);
    expect(fake.calls[0].init.signal).toBeInstanceOf(AbortSignal);
  });

  it('página de recusa do firewall vira 503, não "nota não achada"', async () => {
    const { log, source } = sourceWith({
      kind: 'page',
      status: 200,
      body: '<html><head><title>Request Rejected</title></head></html>',
    });
    await expect(source.fetchPage(`${KEY}|3|1`)).rejects.toThrow(
      /recusada pelo firewall.*importe o HTML/,
    );
    expect(log.entries[0].reason).toBe('consulta recusada pelo firewall');
  });

  it('o log traz o código da queda, que o "fetch failed" esconde na causa', async () => {
    const cause = Object.assign(new Error('read ECONNRESET'), {
      code: 'ECONNRESET',
    });
    const reset = new TypeError('fetch failed', { cause });
    const { log, source } = sourceWith({ kind: 'error', error: reset });
    await expect(source.fetchPage(`${KEY}|3|1`)).rejects.toThrow(
      /importe o HTML/,
    );
    expect(log.entries[0].reason).toBe('TypeError: fetch failed (ECONNRESET)');
  });

  it('SEFAZ fora do ar (status 500) vira 503 e fica no log', async () => {
    const { log, source } = sourceWith({
      kind: 'page',
      status: 500,
      body: 'erro',
    });
    await expect(source.fetchPage(`${KEY}|3|1`)).rejects.toThrow(
      ServiceUnavailableException,
    );
    expect(log.entries).toEqual([
      { event: 'nfce_fetch_failed', accessKey: KEY, reason: 'HTTP 500' },
    ]);
  });

  it('tempo esgotado vira 503 com a saída para o gasto à mão', async () => {
    const timeout = new DOMException('signal timed out', 'TimeoutError');
    const { log, source } = sourceWith({ kind: 'error', error: timeout });
    await expect(source.fetchPage(`${KEY}|3|1`)).rejects.toThrow(
      /não respondeu.*lance o gasto à mão/,
    );
    expect(log.entries[0].reason).toBe('TimeoutError: signal timed out');
  });

  it('queda no meio da leitura da página também vira 503', async () => {
    const dropped = new TypeError('terminated');
    const { log, source } = sourceWith({ kind: 'dropped', error: dropped });
    await expect(source.fetchPage(`${KEY}|3|1`)).rejects.toThrow(
      ServiceUnavailableException,
    );
    expect(log.entries[0].reason).toBe('TypeError: terminated');
  });

  it('sem internet vira 503', async () => {
    const offline = new TypeError('fetch failed');
    const { source } = sourceWith({ kind: 'error', error: offline });
    await expect(source.fetchPage(`${KEY}|3|1`)).rejects.toThrow(
      ServiceUnavailableException,
    );
  });
});
