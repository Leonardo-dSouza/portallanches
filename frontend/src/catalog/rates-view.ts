import type { DayGroup, MotoboyRate } from '../api/types';

/** Linhas do grupo, da vigência mais recente para a mais antiga. */
export function ratesOfGroup(
  rates: MotoboyRate[],
  group: DayGroup,
): MotoboyRate[] {
  return rates
    .filter((rate) => rate.dayGroup === group)
    .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom));
}

/**
 * Diária em vigor num dia: a linha mais recente com vigência até esse dia
 * (comparação de datas `AAAA-MM-DD`, sem cálculo de dinheiro). `null` se ainda não há.
 *
 * @example currentRate(rates, 'FRI_SUN', '2026-09-22')
 */
export function currentRate(
  rates: MotoboyRate[],
  group: DayGroup,
  today: string,
): MotoboyRate | null {
  return (
    ratesOfGroup(rates, group).find((rate) => rate.effectiveFrom <= today) ??
    null
  );
}

/** Opções do campo "Dias" do formulário de diária. */
export const GROUP_OPTIONS: { value: DayGroup; label: string }[] = [
  { value: 'TUE_THU', label: 'Terça a quinta' },
  { value: 'FRI_SUN', label: 'Sexta a domingo' },
];
