import { describe, expect, it } from 'vitest';
import { ApiError, type FetchFn } from './api-client';
import {
  createEventStreamOpener,
  parseSseEvents,
  type SseEvent,
} from './event-stream';

class ScriptedStreamFetch {
  readonly calls: { input: string; init?: RequestInit }[] = [];
  private readonly chunks: Uint8Array[];
  private readonly status: number;

  constructor(chunks: string[], status = 200) {
    const encoder = new TextEncoder();
    this.chunks = chunks.map((chunk) => encoder.encode(chunk));
    this.status = status;
  }

  readonly fetch: FetchFn = async (input, init) => {
    this.calls.push({ input, init });
    if (this.status !== 200) {
      return new Response(JSON.stringify({ message: 'Não autorizado' }), {
        status: this.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const chunks = [...this.chunks];
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        const chunk = chunks.shift();
        if (chunk) {
          controller.enqueue(chunk);
        } else {
          controller.close();
        }
      },
    });
    return new Response(stream, {
      status: this.status,
      headers: { 'Content-Type': 'text/event-stream' },
    });
  };
}

describe('parseSseEvents', () => {
  it('lê um evento com tipo e dado', () => {
    const input = 'event: changed\ndata: {}\n\n';
    const result = parseSseEvents(input);
    expect(result).toEqual({
      events: [{ type: 'changed', data: '{}' }],
      rest: '',
    });
  });

  it('guarda o evento pela metade para o próximo pedaço', () => {
    const input = 'event: changed\nda';
    const result = parseSseEvents(input);
    expect(result).toEqual({
      events: [],
      rest: input,
    });
  });

  it('ignora o comentário do ping', () => {
    const input = ': ping\n\n';
    const result = parseSseEvents(input);
    expect(result).toEqual({
      events: [],
      rest: '',
    });
  });

  it('aceita CRLF', () => {
    const input = 'event: changed\r\ndata: {}\r\n\r\n';
    const result = parseSseEvents(input);
    expect(result).toEqual({
      events: [{ type: 'changed', data: '{}' }],
      rest: '',
    });
  });

  it('usa message como tipo padrão e junta múltiplas linhas de data com newline', () => {
    const input = 'data: linha 1\ndata: linha 2\n\n';
    const result = parseSseEvents(input);
    expect(result).toEqual({
      events: [{ type: 'message', data: 'linha 1\nlinha 2' }],
      rest: '',
    });
  });
});

describe('createEventStreamOpener', () => {
  it('manda o Bearer e entrega cada evento', async () => {
    const fake = new ScriptedStreamFetch([
      'event: ready\ndata: {}\n\nevent: ch',
      'anged\ndata: {}\n\n',
    ]);
    const opener = createEventStreamOpener('/api', () => 'tok', fake.fetch);
    const events: SseEvent[] = [];
    const controller = new AbortController();

    await opener('/live/events', (ev) => events.push(ev), controller.signal);

    expect(fake.calls[0].input).toBe('/api/live/events');
    expect(fake.calls[0].init?.headers).toMatchObject({
      Authorization: 'Bearer tok',
      Accept: 'text/event-stream',
    });
    expect(events).toEqual([
      { type: 'ready', data: '{}' },
      { type: 'changed', data: '{}' },
    ]);
  });

  it('rejeita com ApiError 401', async () => {
    const fake = new ScriptedStreamFetch([], 401);
    const opener = createEventStreamOpener('/api', () => null, fake.fetch);
    const controller = new AbortController();

    await expect(
      opener('/live/events', () => {}, controller.signal),
    ).rejects.toThrow(ApiError);
  });
});
