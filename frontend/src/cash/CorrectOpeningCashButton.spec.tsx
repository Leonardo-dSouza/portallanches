import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { CashApi } from '../api/cash-api';
import type { Money } from '../api/types';
import { CorrectOpeningCashButton } from './CorrectOpeningCashButton';

class FakeCorrectCashApi {
  openedAmount: Money | null = null;

  async openDrawer(amount: Money) {
    this.openedAmount = amount;
    return {
      id: 10,
      businessDate: '2026-09-22',
      status: 'OPEN' as const,
      openingCash: amount,
    };
  }
}

describe('CorrectOpeningCashButton', () => {
  it('abre o diálogo em modo correção, salva na API e notifica onSaved', async () => {
    const cash = new FakeCorrectCashApi();
    let saved = false;
    render(
      <CorrectOpeningCashButton
        cash={cash as unknown as CashApi}
        openingCash="30.00"
        onSaved={() => {
          saved = true;
        }}
      />,
    );

    await userEvent.click(
      screen.getByRole('button', { name: 'Corrigir troco inicial' }),
    );
    expect(
      await screen.findByRole('heading', { name: 'Corrigir troco inicial' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Troco inicial')).toHaveValue('30,00');

    const input = screen.getByLabelText('Troco inicial');
    await userEvent.clear(input);
    await userEvent.type(input, '45,00');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(cash.openedAmount).toBe('45.00');
    expect(saved).toBe(true);
    expect(
      screen.queryByRole('heading', { name: 'Corrigir troco inicial' }),
    ).not.toBeInTheDocument();
  });

  it('botão Voltar fecha o diálogo sem salvar', async () => {
    const cash = new FakeCorrectCashApi();
    let saved = false;
    render(
      <CorrectOpeningCashButton
        cash={cash as unknown as CashApi}
        openingCash="30.00"
        onSaved={() => {
          saved = true;
        }}
      />,
    );

    await userEvent.click(
      screen.getByRole('button', { name: 'Corrigir troco inicial' }),
    );
    await screen.findByRole('heading', { name: 'Corrigir troco inicial' });

    await userEvent.click(screen.getByRole('button', { name: 'Voltar' }));
    expect(
      screen.queryByRole('heading', { name: 'Corrigir troco inicial' }),
    ).not.toBeInTheDocument();
    expect(cash.openedAmount).toBeNull();
    expect(saved).toBe(false);
  });
});
