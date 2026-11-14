import { toApiDecimal } from '../api/quantity';
import type { AppSettings } from '../api/types';
import type { Parsed } from './catalog-values';

const MAX_PERCENT_DECIMALS = 2;

export interface IfoodSettingsForm {
  profitPercent: string;
  commissionPercent: string;
}

export type IfoodSettings = Pick<
  AppSettings,
  'ifoodProfitPercent' | 'ifoodCommissionPercent'
>;

/**
 * Percentual do iFood de 0 a 100 com até 2 casas; `label` entra na mensagem.
 *
 * @example parseIfoodPercent('10', 'o lucro no iFood') // { ok: true, value: '10' }
 */
export function parseIfoodPercent(
  typed: string,
  label: string,
): Parsed<string> {
  const text = typed.trim();
  const example = label.includes('lucro') ? '10' : '28';
  if (text.length === 0) {
    return {
      ok: false,
      error: `Informe ${label}: esperado número de 0 a 100 com até ${MAX_PERCENT_DECIMALS} casas (ex.: ${example})`,
    };
  }
  const decimal = toApiDecimal(text, MAX_PERCENT_DECIMALS);
  if (decimal === null) {
    return {
      ok: false,
      error: `Valor inválido para ${label} "${typed}": esperado número de 0 a 100 com até ${MAX_PERCENT_DECIMALS} casas`,
    };
  }
  if (Number(decimal) > 100) {
    return {
      ok: false,
      error: `Valor inválido para ${label} "${typed}": o valor não pode passar de 100%`,
    };
  }
  return { ok: true, value: decimal };
}

/**
 * Valida os percentuais da aba iFood (lucro e comissão).
 *
 * @example parseIfoodSettings({ profitPercent: '10', commissionPercent: '28' }) // { ok: true, value: { ifoodProfitPercent: '10', ifoodCommissionPercent: '28' } }
 */
export function parseIfoodSettings(
  form: IfoodSettingsForm,
): Parsed<IfoodSettings> {
  const profit = parseIfoodPercent(form.profitPercent, 'o lucro no iFood');
  if (!profit.ok) return profit;
  const commission = parseIfoodPercent(
    form.commissionPercent,
    'a comissão do iFood',
  );
  if (!commission.ok) return commission;
  return {
    ok: true,
    value: {
      ifoodProfitPercent: profit.value,
      ifoodCommissionPercent: commission.value,
    },
  };
}

/**
 * Converte os percentuais do iFood lidos da API para o formulário.
 *
 * @example ifoodFormOf({ ifoodProfitPercent: '10', ifoodCommissionPercent: '28' }) // { profitPercent: '10', commissionPercent: '28' }
 */
export function ifoodFormOf(read: IfoodSettings): IfoodSettingsForm {
  return {
    profitPercent: read.ifoodProfitPercent.replace('.', ','),
    commissionPercent: read.ifoodCommissionPercent.replace('.', ','),
  };
}
