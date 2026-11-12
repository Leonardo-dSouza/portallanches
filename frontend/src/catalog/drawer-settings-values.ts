import { moneyToCents, toApiMoney, typedMoney } from '../api/money';
import type { AppSettings, Money } from '../api/types';
import type { Parsed } from './catalog-values';

/** O mesmo limite do backend para configurações de dinheiro da gaveta. */
const MAX_DRAWER_CENTS = 9999_99;

export interface DrawerSettingsForm {
  openingDefault: string;
  cashTolerance: string;
}

export type DrawerSettings = Pick<
  AppSettings,
  'drawerOpeningDefault' | 'drawerCashTolerance'
>;

/**
 * Dinheiro da gaveta de 0 a 9.999,99 (troco inicial e tolerância); `label` entra na mensagem.
 *
 * @example parseDrawerAmount('40,5', 'o troco inicial') // { ok: true, value: '40.50' }
 */
export function parseDrawerAmount(typed: string, label: string): Parsed<Money> {
  const text = typed.trim();
  if (text.length === 0)
    return {
      ok: false,
      error: `Informe ${label}: esperado valor de 0 a 9.999,99 (ex.: 30,00)`,
    };
  const amount = toApiMoney(text);
  if (amount === null)
    return {
      ok: false,
      error: `Valor inválido para ${label} "${typed}": esperado número de 0 a 9.999,99`,
    };
  if (moneyToCents(amount) > MAX_DRAWER_CENTS)
    return {
      ok: false,
      error: `Valor muito alto para ${label} "${typed}": o valor não pode passar de R$ 9.999,99`,
    };
  return { ok: true, value: amount };
}

/**
 * Valida os valores da subseção Gaveta (troco padrão e tolerância no dinheiro).
 *
 * @example parseDrawerSettings({ openingDefault: '30', cashTolerance: '2' }) // { ok: true, value: { drawerOpeningDefault: '30.00', drawerCashTolerance: '2.00' } }
 */
export function parseDrawerSettings(
  form: DrawerSettingsForm,
): Parsed<DrawerSettings> {
  const opening = parseDrawerAmount(
    form.openingDefault,
    'o troco inicial padrão',
  );
  if (!opening.ok) return opening;
  const tolerance = parseDrawerAmount(
    form.cashTolerance,
    'a diferença aceita no dinheiro',
  );
  if (!tolerance.ok) return tolerance;
  return {
    ok: true,
    value: {
      drawerOpeningDefault: opening.value,
      drawerCashTolerance: tolerance.value,
    },
  };
}

/**
 * Converte as configurações lidas da gaveta para os campos de texto do formulário.
 *
 * @example drawerFormOf({ drawerOpeningDefault: '30.00', drawerCashTolerance: '2.00' }) // { openingDefault: '30,00', cashTolerance: '2,00' }
 */
export function drawerFormOf(read: DrawerSettings): DrawerSettingsForm {
  return {
    openingDefault: typedMoney(read.drawerOpeningDefault),
    cashTolerance: typedMoney(read.drawerCashTolerance),
  };
}
