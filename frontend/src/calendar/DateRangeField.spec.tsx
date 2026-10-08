import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import type { DateRange } from '../api/types';
import { DateRangeField } from './DateRangeField';

function Harness() {
  const [range, setRange] = useState<DateRange>({
    from: '2026-09-01',
    to: '2026-09-30',
  });
  return (
    <>
      <DateRangeField
        label="Período"
        value={range}
        today="2026-10-08"
        onChange={setRange}
      />
      <p>
        período: {range.from} a {range.to}
      </p>
    </>
  );
}

const trigger = () => screen.getByRole('button', { name: /^Período/ });
const day = (name: string) => screen.getByRole('button', { name });

describe('DateRangeField', () => {
  it('mostra o intervalo e, no mês, pinta as pontas', async () => {
    render(<Harness />);
    expect(trigger()).toHaveAccessibleName('Período 01/09/2026 a 30/09/2026');
    await userEvent.click(trigger());
    expect(screen.getByText('setembro de 2026')).toBeInTheDocument();
    expect(day('terça, 1 de setembro de 2026')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByText('Escolha o primeiro dia.')).toBeInTheDocument();
  });

  it('dois cliques escolhem o primeiro e o último dia; fora de ordem, troca', async () => {
    render(<Harness />);
    await userEvent.click(trigger());
    await userEvent.click(day('terça, 15 de setembro de 2026'));
    expect(screen.getByText('Agora o último dia.')).toBeInTheDocument();
    expect(
      screen.getByText('período: 2026-09-01 a 2026-09-30'),
    ).toBeInTheDocument();
    await userEvent.click(day('quinta, 3 de setembro de 2026'));
    expect(
      screen.getByText('período: 2026-09-03 a 2026-09-15'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(trigger()).toHaveFocus();
  });

  it('o mesmo dia duas vezes escolhe um dia só; Esc no meio cancela', async () => {
    render(<Harness />);
    await userEvent.click(trigger());
    await userEvent.click(day('sexta, 25 de setembro de 2026'));
    await userEvent.click(day('sexta, 25 de setembro de 2026'));
    expect(
      screen.getByText('período: 2026-09-25 a 2026-09-25'),
    ).toBeInTheDocument();
    await userEvent.click(trigger());
    await userEvent.click(day('terça, 1 de setembro de 2026'));
    await userEvent.keyboard('{Escape}');
    expect(
      screen.getByText('período: 2026-09-25 a 2026-09-25'),
    ).toBeInTheDocument();
  });
});
