export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

/** Contrato de acesso à API que o restante do app usa; a implementação HTTP é trocável (testes usam fakes). */
export interface ApiClient {
  request<T>(method: HttpMethod, path: string, body?: unknown): Promise<T>;
}

/** Erro de resposta da API; `message` já vem em português do backend. */
export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

type FetchFn = (input: string, init?: RequestInit) => Promise<Response>;

function messageFrom(payload: unknown, status: number): string {
  const message = (payload as { message?: unknown } | null)?.message;
  if (Array.isArray(message)) return message.join('; ');
  if (typeof message === 'string') return message;
  return `Falha na requisição (HTTP ${status})`;
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();
  return text ? (JSON.parse(text) as unknown) : undefined;
}

/**
 * Cliente HTTP sobre `fetch`: envia o token Bearer e converte respostas de erro em `ApiError`.
 *
 * @example const api = createHttpApiClient('/api', () => localStorage.getItem('token'));
 */
export function createHttpApiClient(
  baseUrl: string,
  getToken: () => string | null,
  fetchFn: FetchFn = (input, init) => fetch(input, init),
): ApiClient {
  return {
    async request<T>(
      method: HttpMethod,
      path: string,
      body?: unknown,
    ): Promise<T> {
      const token = getToken();
      const response = await fetchFn(`${baseUrl}${path}`, {
        method,
        headers: {
          ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const payload = await readJson(response);
      if (!response.ok)
        throw new ApiError(
          response.status,
          messageFrom(payload, response.status),
        );
      return payload as T;
    },
  };
}
