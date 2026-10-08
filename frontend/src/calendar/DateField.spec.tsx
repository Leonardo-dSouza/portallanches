import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { DateField } from './DateField';

/** Campo controlado, como nas telas: guarda a data escolhida e mostra no botão. */
function Harness(props: { start: string; isDisabled?(date: string): boolean }) {
  const [value, setValue] = useState(props.start);
  return (
    <>
      <DateField
        label="Data do caixa"
        value={value}
        today="2026-10-08"
        isDisabled={props.isDisabled}
        onChange={setValue}
      />
      <p>escolhida: {value}</p>
    </>
  );
}

const trigger = () => screen.getByRole('button', { name: /^Data do caixa/ });

describe('DateField', () => {
  it('abre o mês da data, escolhe um dia com o mouse, fecha e devolve o foco', async () => {
    render(<Harness start="2026-10-07" />);
    expect(trigger()).toHaveAccessibleName('Data do caixa qua, 07/10/2026');
    await userEvent.click(trigger());
    expect(
      screen.getByRole('dialog', { name: 'Escolher data do caixa' }),
    ).toBeInTheDocument();
    expect(screen.getByText('outubro de 2026')).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole('button', { name: 'sexta, 2 de outubro de 2026' }),
    );
    expect(screen.getByText('escolhida: 2026-10-02')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(trigger()).toHaveFocus();
  });

  it('pelo teclado: o foco começa no dia escolhido, setas andam e Enter escolhe', async () => {
    render(<Harness start="2026-10-07" />);
    await userEvent.click(trigger());
    expect(
      screen.getByRole('button', { name: 'quarta, 7 de outubro de 2026' }),
    ).toHaveFocus();
    await userEvent.keyboard('{ArrowDown}{ArrowRight}{Enter}');
    expect(screen.getByText('escolhida: 2026-10-15')).toBeInTheDocument();
  });

  it('as setas do cabeçalho trocam o mês; Esc fecha sem mudar', async () => {
    render(<Harness start="2026-10-07" />);
    await userEvent.click(trigger());
    await userEvent.click(screen.getByRole('button', { name: 'Mês anterior' }));
    expect(screen.getByText('setembro de 2026')).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByText('escolhida: 2026-10-07')).toBeInTheDocument();
  });

  it('"Hoje" escolhe o dia de hoje', async () => {
    render(<Harness start="2026-09-01" />);
    await userEvent.click(trigger());
    await userEvent.click(screen.getByRole('button', { name: 'Hoje' }));
    expect(screen.getByText('escolhida: 2026-10-08')).toBeInTheDocument();
  });

  it('dia fora do permitido fica desativado', async () => {
    render(
      <Harness start="2026-10-07" isDisabled={(date) => date < '2026-10-01'} />,
    );
    await userEvent.click(trigger());
    expect(
      screen.getByRole('button', { name: 'quarta, 30 de setembro de 2026' }),
    ).toBeDisabled();
  });

  it('clicar fora fecha', async () => {
    render(<Harness start="2026-10-07" />);
    await userEvent.click(trigger());
    await userEvent.click(screen.getByText('escolhida: 2026-10-07'));
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
