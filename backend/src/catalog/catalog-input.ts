import {
  parseBoolean,
  parseChoice,
  parseNonNegativeInt,
  parseObject,
  parseText,
} from '../common/input-parsers.js';
import { parseMoney } from '../common/money.js';
import { parseBusinessDate, type DayGroup } from '../closing/business-date.js';

const MAX_NAME_LENGTH = 80;
const DAY_GROUPS: readonly DayGroup[] = ['TUE_THU', 'FRI_SUN'];

export interface PaymentMethodInput {
  name: string;
  active: boolean;
  sortOrder: number;
}

export interface DeliveryZoneInput {
  neighborhood: string;
  fee: string;
  active: boolean;
}

export interface MotoboyRateInput {
  dayGroup: DayGroup;
  amount: string;
  effectiveFrom: string;
}

/** @example parsePaymentMethodInput({ name: 'PIX', active: true, sortOrder: 0 }) */
export function parsePaymentMethodInput(body: unknown): PaymentMethodInput {
  const fields = parseObject(body, 'forma de pagamento');
  return {
    name: parseText(fields.name, 'name', MAX_NAME_LENGTH),
    active: parseBoolean(fields.active, 'active'),
    sortOrder: parseNonNegativeInt(fields.sortOrder, 'sortOrder'),
  };
}

/** @example parseDeliveryZoneInput({ neighborhood: 'Centro', fee: 5, active: true }) */
export function parseDeliveryZoneInput(body: unknown): DeliveryZoneInput {
  const fields = parseObject(body, 'bairro');
  return {
    neighborhood: parseText(
      fields.neighborhood,
      'neighborhood',
      MAX_NAME_LENGTH,
    ),
    fee: parseMoney(fields.fee, 'fee', true),
    active: parseBoolean(fields.active, 'active'),
  };
}

/**
 * Bairro novo lançado na hora pelo caixa: nasce sempre ativo; só o admin
 * (PUT) desativa ou muda o padrão depois.
 *
 * @example parseNewDeliveryZoneInput({ neighborhood: 'Dunamis', fee: 8 })
 */
export function parseNewDeliveryZoneInput(body: unknown): DeliveryZoneInput {
  const fields = parseObject(body, 'bairro');
  return parseDeliveryZoneInput({ ...fields, active: true });
}

/** @example parseMotoboyRateInput({ dayGroup: 'FRI_SUN', amount: 60, effectiveFrom: '2026-10-01' }) */
export function parseMotoboyRateInput(body: unknown): MotoboyRateInput {
  const fields = parseObject(body, 'diária do motoboy');
  return {
    dayGroup: parseChoice(fields.dayGroup, 'dayGroup', DAY_GROUPS),
    amount: parseMoney(fields.amount, 'amount', false),
    effectiveFrom: parseBusinessDate(String(fields.effectiveFrom)),
  };
}
