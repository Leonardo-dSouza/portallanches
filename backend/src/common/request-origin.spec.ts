import {
  currentRequestOrigin,
  trackRequestOrigin,
  UNKNOWN_ORIGIN,
} from './request-origin.js';

/** Roda `inside` como se fosse o resto do pedido, depois do middleware. */
function withinRequest<T>(
  ip: string | undefined,
  inside: () => Promise<T>,
): Promise<T> {
  return new Promise((resolve, reject) => {
    trackRequestOrigin({ ip }, {}, () => {
      inside().then(resolve, reject);
    });
  });
}

describe('origem do pedido', () => {
  it('o IP do pedido continua visível depois de um await', async () => {
    const seen = await withinRequest('10.0.0.2', async () => {
      await new Promise((resolve) => setTimeout(resolve, 1));
      return currentRequestOrigin();
    });
    expect(seen).toBe('10.0.0.2');
  });

  it('pedidos ao mesmo tempo não misturam o IP', async () => {
    const seen = await Promise.all(
      ['10.0.0.2', '10.0.0.3'].map((ip, index) =>
        withinRequest(ip, async () => {
          await new Promise((resolve) => setTimeout(resolve, 5 - index * 4));
          return currentRequestOrigin();
        }),
      ),
    );
    expect(seen).toEqual(['10.0.0.2', '10.0.0.3']);
  });

  it('fora de um pedido, ou sem IP no socket, é desconhecido', async () => {
    expect(currentRequestOrigin()).toBe(UNKNOWN_ORIGIN);
    expect(
      await withinRequest(undefined, async () => currentRequestOrigin()),
    ).toBe(UNKNOWN_ORIGIN);
  });
});
