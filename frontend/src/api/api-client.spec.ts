import { ApiError, createHttpApiClient } from './api-client';

interface RecordedCall {
  input: string;
  init?: RequestInit;
}

class FakeFetch {
  readonly calls: RecordedCall[] = [];

  private readonly makeResponse: () => Response;

  constructor(makeResponse: () => Response) {
    this.makeResponse = makeResponse;
  }

  readonly fetch = async (
    input: string,
    init?: RequestInit,
  ): Promise<Response> => {
    this.calls.push({ input, init });
    return this.makeResponse();
  };
}

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status });

describe('createHttpApiClient', () => {
  it('envia o token Bearer e o corpo JSON', async () => {
    const fake = new FakeFetch(() => jsonResponse({ ok: true }));
    const api = createHttpApiClient('/api', () => 'abc', fake.fetch);
    await api.request('POST', '/orders', { amount: 10 });
    expect(fake.calls[0].input).toBe('/api/orders');
    expect(fake.calls[0].init?.headers).toMatchObject({
      Authorization: 'Bearer abc',
      'Content-Type': 'application/json',
    });
    expect(fake.calls[0].init?.body).toBe('{"amount":10}');
  });

  it('não envia Authorization sem token', async () => {
    const fake = new FakeFetch(() => jsonResponse({}));
    await createHttpApiClient('/api', () => null, fake.fetch).request(
      'GET',
      '/',
    );
    expect(fake.calls[0].init?.headers).not.toHaveProperty('Authorization');
  });

  it('devolve undefined em resposta sem corpo (204)', async () => {
    const fake = new FakeFetch(() => new Response(null, { status: 204 }));
    const result = await createHttpApiClient(
      '/api',
      () => null,
      fake.fetch,
    ).request('POST', '/auth/logout');
    expect(result).toBeUndefined();
  });

  it('converte erro em ApiError com a mensagem do backend', async () => {
    const fake = new FakeFetch(() =>
      jsonResponse({ message: 'Credenciais inválidas' }, 401),
    );
    const api = createHttpApiClient('/api', () => null, fake.fetch);
    await expect(api.request('POST', '/auth/login', {})).rejects.toMatchObject({
      status: 401,
      message: 'Credenciais inválidas',
    });
    await expect(api.request('POST', '/auth/login', {})).rejects.toBeInstanceOf(
      ApiError,
    );
  });

  it('usa mensagem padrão citando o status quando o corpo não tem message', async () => {
    const fake = new FakeFetch(() => new Response('', { status: 502 }));
    const api = createHttpApiClient('/api', () => null, fake.fetch);
    await expect(api.request('GET', '/x')).rejects.toThrow(/HTTP 502/);
  });
});
