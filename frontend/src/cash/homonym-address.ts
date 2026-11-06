import type { Customer, DeliveryZone } from '../api/types';
import { formatAddress, normalizeHouseNumber } from './address';
import { toNeighborhoodKey } from './neighborhood-key';
import { findZone, type OrderFormValues } from './order-form-values';
import type { ResolvedCustomer } from './use-customer-lookup';

/*
 * S5-11 (2026-11-06): sem telefone, a busca pelo nome acha o Thiago 1 e preenche o endereço;
 * o caixa troca o endereço para o do Thiago 2 e salvar sobrescrevia o cadastro do Thiago 1.
 * Agora, achado pelo nome com outro endereço, o caixa diz se é a mesma pessoa ou outra.
 */

/** "Mesma pessoa" (atualiza o cadastro) ou "outra pessoa" (cadastra um cliente novo). */
export type HomonymAnswer = 'same' | 'other';

const sameText = (typed: string, onFile: string | null): boolean =>
  toNeighborhoodKey(typed) === toNeighborhoodKey(onFile ?? '');

/**
 * Rua, número ou bairro do formulário diferentes do cadastro. A referência sozinha não conta:
 * ela muda à toa ("casa azul" → "portão verde") e a pergunta viraria ruído (decisão do usuário).
 *
 * @example addressDiffersFromRecord(thiago, { ...values, street: 'Rua B' }, zones) // true
 */
export function addressDiffersFromRecord(
  known: Customer,
  values: OrderFormValues,
  zones: DeliveryZone[],
): boolean {
  const number = normalizeHouseNumber(values.houseNumber);
  const zoneId = findZone(zones, values.neighborhood)?.id ?? null;
  return (
    !sameText(values.street, known.street) ||
    !sameText(number, known.number) ||
    zoneId !== known.deliveryZoneId
  );
}

/**
 * O cliente a gravar depois da resposta. Outra pessoa sai sem o telefone: achado pelo nome, o
 * telefone no formulário (se houver) veio do cadastro antigo, e telefone é único no banco.
 *
 * @example applyHomonymAnswer(resolved, 'other') // { known: null, values: { ...values, phone: '' } }
 */
export function applyHomonymAnswer(
  resolved: ResolvedCustomer,
  answer: HomonymAnswer,
): ResolvedCustomer {
  if (answer === 'same') return resolved;
  return { known: null, values: { ...resolved.values, phone: '' } };
}

/**
 * O endereço do cadastro como a janela mostra; null no cliente sem rua (só fiado do balcão).
 *
 * @example recordAddressLabel(thiago, zones) // 'Rua das Flores, 12 · Monterrey'
 */
export function recordAddressLabel(
  known: Customer,
  zones: DeliveryZone[],
): string | null {
  if (!known.street) return null;
  const zone = zones.find((z) => z.id === known.deliveryZoneId);
  const address = formatAddress(known.street, known.number);
  return zone ? `${address} · ${zone.neighborhood}` : address;
}

/**
 * O endereço digitado no pedido, como vai ser gravado.
 *
 * @example typedAddressLabel({ ...values, street: 'Rua B', houseNumber: 'sn', neighborhood: 'Centro' }) // 'Rua B, S/N · Centro'
 */
export function typedAddressLabel(values: OrderFormValues): string {
  const street = values.street.trim();
  const address = formatAddress(
    street,
    normalizeHouseNumber(values.houseNumber),
  );
  return `${address} · ${values.neighborhood.trim()}`;
}
