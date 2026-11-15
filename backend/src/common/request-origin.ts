import { AsyncLocalStorage } from 'node:async_hooks';

/** De onde veio o pedido em andamento: o IP que o Express vê, já com o `trust proxy` do `main.ts`. */
export type RequestOrigin = () => string;

export const REQUEST_ORIGIN = Symbol('REQUEST_ORIGIN');

/** Fora de um pedido (ou sem IP no socket). */
export const UNKNOWN_ORIGIN = 'desconhecido';

const originStorage = new AsyncLocalStorage<string>();

/**
 * Middleware do Express que guarda o IP do pedido para o código que roda dentro dele. A senha do
 * admin é conferida longe do controller (no serviço do pedido, do fiado, do fechamento), e o
 * limitador precisa saber de que aparelho veio a tentativa (S-03, 2026-11-15).
 * Registrar depois dos leitores de corpo: o fim da leitura do corpo roda fora do contexto.
 *
 * @example app.use(trackRequestOrigin);
 */
export function trackRequestOrigin(
  request: { ip?: string },
  _response: unknown,
  next: () => void,
): void {
  originStorage.run(request.ip ?? UNKNOWN_ORIGIN, next);
}

/**
 * IP do pedido em andamento, ou `UNKNOWN_ORIGIN` fora de um.
 *
 * @example currentRequestOrigin() // '172.18.0.4'
 */
export const currentRequestOrigin: RequestOrigin = () =>
  originStorage.getStore() ?? UNKNOWN_ORIGIN;
