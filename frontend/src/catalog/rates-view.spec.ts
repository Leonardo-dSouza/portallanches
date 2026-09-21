import type { MotoboyRate } from '../api/types';
import { currentRate, ratesOfGroup } from './rates-view';

const rate = (
  id: number,
  dayGroup: MotoboyRate['dayGroup'],
  amount: string,
  effectiveFrom: string,
): MotoboyRate => ({ id, dayGroup, amount, effectiveFrom, createdById: 1 });

const RATES = [
  rate(1, 'FRI_SUN', '60.00', '2026-01-01'),
  rate(2, 'FRI_SUN', '70.00', '2026-10-01'),
  rate(3, 'TUE_THU', '40.00', '2026-01-01'),
  rate(4, 'FRI_SUN', '65.00', '2026-06-01'),
];

describe('ratesOfGroup', () => {
  it('filtra o grupo e ordena da vigência mais nova para a mais antiga', () => {
    expect(ratesOfGroup(RATES, 'FRI_SUN').map((r) => r.id)).toEqual([2, 4, 1]);
  });
});

describe('currentRate', () => {
  it('pega a mais recente que já começou, ignorando as agendadas', () => {
    expect(currentRate(RATES, 'FRI_SUN', '2026-09-22')?.amount).toBe('65.00');
  });

  it('no dia exato da vigência a nova já vale', () => {
    expect(currentRate(RATES, 'FRI_SUN', '2026-10-01')?.amount).toBe('70.00');
  });

  it('devolve null antes de qualquer vigência', () => {
    expect(currentRate(RATES, 'TUE_THU', '2025-12-31')).toBeNull();
  });
});
