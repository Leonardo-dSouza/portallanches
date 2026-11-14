import { parsePercent } from '../common/percent.js';

export const IFOOD_PROFIT_PERCENT_KEY = 'ifood_profit_percent';
export const IFOOD_COMMISSION_PERCENT_KEY = 'ifood_commission_percent';

/** Padrão da lanchonete: 10% de margem no iFood e 28% de comissão do canal. */
export const DEFAULT_IFOOD_PROFIT_PERCENT = '10';
export const DEFAULT_IFOOD_COMMISSION_PERCENT = '28';

export interface IfoodSettings {
  profitPercent: string;
  commissionPercent: string;
}

/**
 * Valida a margem de lucro desejada para vendas no iFood (de 0 a 100, até 2 casas).
 *
 * @example parseIfoodProfitPercent('10') // '10'
 */
export function parseIfoodProfitPercent(raw: unknown): string {
  return parsePercent(raw, 'ifoodProfitPercent');
}

/**
 * Valida o percentual de comissão cobrado pelo iFood (de 0 a 100, até 2 casas).
 *
 * @example parseIfoodCommissionPercent('28') // '28'
 */
export function parseIfoodCommissionPercent(raw: unknown): string {
  return parsePercent(raw, 'ifoodCommissionPercent');
}

/**
 * Lê a margem do iFood gravada; ausente ou corrompida vira o padrão ('10').
 *
 * @example readStoredIfoodProfitPercent(null) // '10'
 */
export function readStoredIfoodProfitPercent(stored: string | null): string {
  if (stored === null) return DEFAULT_IFOOD_PROFIT_PERCENT;
  try {
    return parseIfoodProfitPercent(stored);
  } catch {
    return DEFAULT_IFOOD_PROFIT_PERCENT;
  }
}

/**
 * Lê a comissão do iFood gravada; ausente ou corrompida vira o padrão ('28').
 *
 * @example readStoredIfoodCommissionPercent(null) // '28'
 */
export function readStoredIfoodCommissionPercent(
  stored: string | null,
): string {
  if (stored === null) return DEFAULT_IFOOD_COMMISSION_PERCENT;
  try {
    return parseIfoodCommissionPercent(stored);
  } catch {
    return DEFAULT_IFOOD_COMMISSION_PERCENT;
  }
}

/**
 * Lê os percentuais de precificação do iFood aplicando os padrões ('10' e '28').
 *
 * @example readIfoodSettings(null, null) // { profitPercent: '10', commissionPercent: '28' }
 */
export function readIfoodSettings(
  profitStored: string | null,
  commissionStored: string | null,
): IfoodSettings {
  return {
    profitPercent: readStoredIfoodProfitPercent(profitStored),
    commissionPercent: readStoredIfoodCommissionPercent(commissionStored),
  };
}
