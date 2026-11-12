import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError } from '../api/api-client';
import type { CashApi } from '../api/cash-api';
import type { Money } from '../api/types';
import { OpeningDrawerDialog } from './OpeningDrawerDialog';

class FakeOpeningCashApi {
  openedAmount: Money | null = null;
  failure: Error | null = null;

  async openDrawer(amount: Money) {
    if (this.failure) throw this.failure;
    this.openedAmount = amount;
    return {
      id: 10,
      businessDate: '2026-09-22',
      status: 'OPEN' as const,
      openingCash: amount,
    };
  }
}

describe('OpeningDrawerDialog', () => {
  it('modo abertura: abre preenchido, sem botão de voltar ou fechar, e Enter grava', async () => {
    const cash = new FakeOpeningCashApi();
    let saved = false;
    render(
      <OpeningDrawerDialog
        cash={cash as unknown as CashApi}
        initialAmount="30.00"
        onSaved={() => {
          saved = true;
        }}
      />,
    );
    expect(
      screen.getByRole('heading', { name: 'Abrir o caixa' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Conte as notas da gaveta.')).toBeInTheDocument();
    expect(screen.getByLabelText('Troco inicial')).toHaveValue('30,00');
    expect(
      screen.queryByRole('button', { name: 'Voltar' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Fechar' }),
    ).not.toBeInTheDocument();

    await userEvent.keyboard('{Enter}');
    expect(cash.openedAmount).toBe('30.00');
    expect(saved).toBe(true);
  });

  it('valor inválido exibe erro e não chama a API', async () => {
    const cash = new FakeOpeningCashApi();
    render(
      <OpeningDrawerDialog
        cash={cash as unknown as CashApi}
        initialAmount="30.00"
        onSaved={() => undefined}
      />,
    );
    const input = screen.getByLabelText('Troco inicial');
    await userEvent.clear(input);
    await userEvent.type(input, 'abc{Enter}');

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Valor inválido para o troco inicial "abc": esperado número de 0 a 9.999,99',
    );
    expect(cash.openedAmount).toBeNull();
  });

  it('erro 409 da API é exibido no diálogo', async () => {
    const cash = new FakeOpeningCashApi();
    cash.failure = new ApiError(
      409,
      'Troco inicial já informado: R$ 30,00; corrigir é com o admin',
    );
    render(
      <OpeningDrawerDialog
        cash={cash as unknown as CashApi}
        initialAmount="30.00"
        onSaved={() => undefined}
      />,
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Abrir o caixa' }),
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Troco inicial já informado: R$ 30,00; corrigir é com o admin',
    );
  });

  it('modo correção: título próprio, campo preenchido, e botão Voltar fecha', async () => {
    const cash = new FakeOpeningCashApi();
    let closed = false;
    let saved = false;
    render(
      <OpeningDrawerDialog
        cash={cash as unknown as CashApi}
        initialAmount="40.00"
        onClose={() => {
          closed = true;
        }}
        onSaved={() => {
          saved = true;
        }}
      />,
    );
    expect(
      screen.getByRole('heading', { name: 'Corrigir troco inicial' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Troco inicial')).toHaveValue('40,00');

    await userEvent.click(screen.getByRole('button', { name: 'Voltar' }));
    expect(closed).toBe(true);
    expect(cash.openedAmount).toBeNull();
    expect(saved).toBe(false);
  });

  it('modo correção: altera o valor e salva chamando a API', async () => {
    const cash = new FakeOpeningCashApi();
    let saved = false;
    render(
      <OpeningDrawerDialog
        cash={cash as unknown as CashApi}
        initialAmount="40.00"
        onClose={() => undefined}
        onSaved={() => {
          saved = true;
        }}
      />,
    );
    const input = screen.getByLabelText('Troco inicial');
    await userEvent.clear(input);
    await userEvent.type(input, '50,00');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(cash.openedAmount).toBe('50.00');
    expect(saved).toBe(true);
  });
});
