import type { Customer } from '../api/types';
import { toNeighborhoodKey } from '../cash/neighborhood-key';

/**
 * `GET /customers` do fake, como o backend: `?phone=` acha pelo telefone (0 ou 1); sem
 * telefone, `?name=` acha pelo nome sem acento e maiúsculas (homônimos vêm todos).
 *
 * @example searchFakeCustomers(customers, 'name=joao') // [{ id: 7, name: 'João', ... }]
 */
export function searchFakeCustomers(
  customers: Customer[],
  query: string,
): Customer[] {
  const params = new URLSearchParams(query);
  const phone = params.get('phone');
  if (phone) return customers.filter((c) => c.phone === phone);
  const nameKey = toNeighborhoodKey(params.get('name') ?? '');
  if (!nameKey) return [];
  return customers.filter((c) => toNeighborhoodKey(c.name) === nameKey);
}
