import { apiErrorFrom, type FetchFn } from './api-client';

export interface SseEvent {
  type: string;
  data: string;
}

/** Posição logo depois da última linha vazia (fim do último evento completo), ou -1 se não há. */
function findLastBlockEnd(buffer: string): number {
  const matches = [...buffer.matchAll(/(?:\r?\n){2,}/g)];
  if (matches.length === 0) return -1;
  const lastMatch = matches[matches.length - 1];
  return (lastMatch.index ?? 0) + lastMatch[0].length;
}

function parseSingleBlock(block: string): SseEvent | null {
  const lines = block.split(/\r?\n/);
  const dataLines: string[] = [];
  let eventType: string | undefined;

  for (const line of lines) {
    if (line.startsWith(':') || line === '') continue;
    if (line.startsWith('event:')) {
      eventType = line.slice(6).replace(/^ /, '');
    } else if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).replace(/^ /, ''));
    }
  }

  if (eventType === undefined && dataLines.length === 0) return null;
  return {
    type: eventType ?? 'message',
    data: dataLines.join('\n'),
  };
}

/**
 * Separa os eventos completos (terminados em linha vazia) e devolve o resto para o próximo pedaço.
 *
 * @example const { events, rest } = parseSseEvents('event: changed\ndata: {}\n\n');
 */
export function parseSseEvents(buffer: string): {
  events: SseEvent[];
  rest: string;
} {
  const end = findLastBlockEnd(buffer);
  if (end === -1) return { events: [], rest: buffer };

  const complete = buffer.slice(0, end);
  const rest = buffer.slice(end);
  const rawBlocks = complete.split(/(?:\r?\n){2,}/);
  const events: SseEvent[] = [];

  for (const raw of rawBlocks) {
    const parsed = parseSingleBlock(raw);
    if (parsed) events.push(parsed);
  }

  return { events, rest };
}

async function readStreamLoop(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  onEvent: (event: SseEvent) => void,
  signal: AbortSignal,
): Promise<void> {
  const decoder = new TextDecoder();
  let buffer = '';

  while (!signal.aborted) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parsed = parseSseEvents(buffer);
    buffer = parsed.rest;
    for (const event of parsed.events) {
      onEvent(event);
    }
  }
}

/** Abre o stream; resolve quando o servidor fecha; rejeita com ApiError (status) se a resposta não for 2xx. */
export type EventStreamOpener = (
  path: string,
  onEvent: (event: SseEvent) => void,
  signal: AbortSignal,
) => Promise<void>;

/**
 * Cria função para abrir stream SSE autenticado com Bearer token via fetch.
 *
 * @example const open = createEventStreamOpener('/api', () => token);
 */
export function createEventStreamOpener(
  baseUrl: string,
  getToken: () => string | null,
  fetchFn: FetchFn = (input, init) => fetch(input, init),
): EventStreamOpener {
  return async (path, onEvent, signal) => {
    if (signal.aborted) return;
    const token = getToken();
    const headers: Record<string, string> = {
      Accept: 'text/event-stream',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
    const response = await fetchFn(`${baseUrl}${path}`, { headers, signal });
    if (!response.ok) throw await apiErrorFrom(response);
    if (!response.body) return;
    const reader = response.body.getReader();
    try {
      await readStreamLoop(reader, onEvent, signal);
    } catch (err) {
      if (!signal.aborted) throw err;
    } finally {
      reader.releaseLock?.();
    }
  };
}
