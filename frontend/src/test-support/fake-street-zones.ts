import type { Customer, StreetZoneCount } from '../api/types';

/**
 * Ruas distintas dos clientes, do bairro se `deliveryZoneId` vier na query (`/customers/streets`).
 *
 * @example fakeStreets(customers, 'deliveryZoneId=3') // ['Rua A']
 */
export function fakeStreets(customers: Customer[], query: string): string[] {
  const zone = Number(new URLSearchParams(query).get('deliveryZoneId'));
  const inZone = customers.filter((c) => !zone || c.deliveryZoneId === zone);
  return [...new Set(inZone.map((c) => c.street))].sort();
}

/**
 * Uma linha por rua + bairro com quantos clientes, como o `groupBy` do backend
 * (`/customers/street-zones`).
 *
 * @example fakeStreetZones(customers)[0] // { street: 'Rua A', deliveryZoneId: 3, customers: 2 }
 */
export function fakeStreetZones(customers: Customer[]): StreetZoneCount[] {
  const counts = new Map<string, StreetZoneCount>();
  for (const { street, deliveryZoneId } of customers) {
    const key = `${street}|${deliveryZoneId}`;
    const found = counts.get(key) ?? { street, deliveryZoneId, customers: 0 };
    counts.set(key, { ...found, customers: found.customers + 1 });
  }
  return [...counts.values()];
}
