import type { DeliveryZone, StreetZoneCount } from '../api/types';
import { withOrderField, type OrderFormValues } from './order-form-values';
import { toStreetKey } from './street-key';

/** Clientes por bairro na rua digitada, somando as grafias da mesma rua. */
function customersByZone(
  street: string,
  counts: readonly StreetZoneCount[],
): Map<number, number> {
  const key = toStreetKey(street);
  const byZone = new Map<number, number>();
  for (const count of counts) {
    if (toStreetKey(count.street) !== key) continue;
    const before = byZone.get(count.deliveryZoneId) ?? 0;
    byZone.set(count.deliveryZoneId, before + count.customers);
  }
  return byZone;
}

/**
 * Bairro de uma rua pelos clientes já cadastrados (pedido do usuário, 2026-10-09: Rua Camomila
 * é do Pousada do Vale). Rua em mais de um bairro fica com o de mais clientes (empate: menor
 * id); só bairros ativos; rua desconhecida = null.
 *
 * @example inferZone('r. camomila', counts, zones)?.neighborhood // 'Pousada do Vale'
 */
export function inferZone(
  street: string,
  counts: readonly StreetZoneCount[],
  zones: readonly DeliveryZone[],
): DeliveryZone | null {
  const byZone = customersByZone(street, counts);
  const candidates = zones
    .filter((zone) => zone.active && byZone.has(zone.id))
    .sort((a, b) => byZone.get(b.id)! - byZone.get(a.id)! || a.id - b.id);
  return candidates[0] ?? null;
}

/**
 * Ao sair da Rua de um cliente novo: com o Bairro vazio, preenche o bairro da rua e a taxa dele.
 * Bairro já digitado (ou vindo do cliente achado) não muda.
 *
 * @example fillZoneFromStreet({ ...values, street: 'Rua Camomila' }, counts, zones).neighborhood // 'Pousada do Vale'
 */
export function fillZoneFromStreet(
  values: OrderFormValues,
  counts: readonly StreetZoneCount[],
  zones: DeliveryZone[],
): OrderFormValues {
  if (values.neighborhood.trim() !== '') return values;
  const zone = inferZone(values.street, counts, zones);
  if (!zone) return values;
  return withOrderField(values, 'neighborhood', zone.neighborhood, zones);
}
