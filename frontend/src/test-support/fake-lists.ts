import type { HttpMethod } from '../api/api-client';

/**
 * Lista depois de gravar, como as rotas REST do backend: PUT troca o item de mesmo id, POST
 * acrescenta no fim.
 *
 * @example savedInto(api.orders, order, 'PUT')
 */
export function savedInto<T extends { id: number }>(
  list: T[],
  item: T,
  method: HttpMethod,
): T[] {
  if (method !== 'PUT') return [...list, item];
  return list.map((current) => (current.id === item.id ? item : current));
}
