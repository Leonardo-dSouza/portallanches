import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { cursorOf, dayLabel, monthTitle } from '../calendar/calendar-math';

const shownMonth = () => screen.getByRole('grid').getAttribute('aria-label');

/**
 * Escolhe um dia num campo de data do app (o calendário mostarda): abre, anda os meses até o
 * do dia e clica nele. Para os testes perto de "hoje" (até um ano para frente ou para trás).
 *
 * @example await pickDate('Vale a partir de', '2026-11-01');
 */
export async function pickDate(label: string, dateKey: string) {
  await userEvent.click(
    screen.getByRole('button', { name: new RegExp(`^${label}`) }),
  );
  const target = monthTitle(cursorOf(dateKey));
  for (let step = 0; step < 12 && shownMonth() !== target; step++)
    await userEvent.click(screen.getByRole('button', { name: 'Próximo mês' }));
  for (let step = 0; step < 24 && shownMonth() !== target; step++)
    await userEvent.click(screen.getByRole('button', { name: 'Mês anterior' }));
  await userEvent.click(
    screen.getByRole('button', { name: dayLabel(dateKey) }),
  );
}
