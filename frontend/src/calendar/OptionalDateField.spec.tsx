import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { OptionalDateField } from './OptionalDateField';

/** Campo controlado, como na grade da Entrada: '' = sem data. */
function Harness(props: { start: string }) {
  const [value, setValue] = useState(props.start);
  return (
    <>
      <OptionalDateField
        label="Validade de Leite"
        hideLabel
        emptyText="Sem validade"
        value={value}
        today="2026-10-08"
        onChange={setValue}
      />
      <p>escolhida: [{value}]</p>
    </>
  );
}

const trigger = () =>
  screen.getByRole('button', { name: /^Validade de Leite/ });

describe('OptionalDateField', () => {
  it('sem data mostra o texto vazio e abre no mês de hoje', async () => {
    render(<Harness start="" />);
    expect(trigger()).toHaveAccessibleName('Validade de Leite Sem validade');
    await userEvent.click(trigger());
    expect(screen.getByText('outubro de 2026')).toBeInTheDocument();
    // Em branco, nenhum dia aparece como escolhido (nem o de hoje).
    expect(
      screen.getByRole('button', { name: 'quinta, 8 de outubro de 2026' }),
    ).not.toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(
      screen.getByRole('button', { name: 'quinta, 15 de outubro de 2026' }),
    );
    expect(screen.getByText('escolhida: [2026-10-15]')).toBeInTheDocument();
    expect(trigger()).toHaveAccessibleName('Validade de Leite qui, 15/10/2026');
  });

  it('"Sem data" limpa e fecha', async () => {
    render(<Harness start="2026-10-15" />);
    await userEvent.click(trigger());
    await userEvent.click(screen.getByRole('button', { name: 'Sem data' }));
    expect(screen.getByText('escolhida: []')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('com `notBefore`, os dias antes dele ficam desligados (o "Pagar em" do fiado)', async () => {
    render(
      <OptionalDateField
        label="Pagar em"
        emptyText="Sem data"
        value=""
        today="2026-10-08"
        notBefore="2026-10-08"
        onChange={() => {}}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: /^Pagar em/ }));
    expect(
      screen.getByRole('button', { name: 'quarta, 7 de outubro de 2026' }),
    ).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'quinta, 8 de outubro de 2026' }),
    ).toBeEnabled();
  });

  it('o rótulo escondido continua no nome acessível, mas fora da tela', () => {
    render(<Harness start="" />);
    expect(screen.getByText('Validade de Leite')).toHaveClass('sr-only');
  });
});
