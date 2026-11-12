import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { CashApi } from '../api/cash-api';
import type { Closing, DrawerCount, DrawerToCount } from '../api/types';
import { DrawerCountForm } from './DrawerCountForm';

class FakeDrawerCashApi {
  closePayload: DrawerCount | undefined;
  closeError: Error | null = null;
  closeCallCount = 0;

  async closeToday(count?: DrawerCount): Promise<Closing> {
    this.closeCallCount += 1;
    this.closePayload = count;
    if (this.closeError) throw this.closeError;
    return { id: 1, businessDate: '2026-10-10', status: 'CLOSED' };
  }
}

const TO_COUNT: DrawerToCount[] = [
  { paymentMethodId: 1, name: 'Dinheiro', isCash: true },
  { paymentMethodId: 2, name: 'PIX', isCash: false },
  { paymentMethodId: 3, name: 'Cartão Ton', isCash: false },
];

describe('DrawerCountForm', () => {
  it('renderiza os campos na ordem de toCount, vazios, e nunca mostra o esperado', () => {
    const fakeCash = new FakeDrawerCashApi();
    render(
      <DrawerCountForm
        cash={fakeCash as unknown as CashApi}
        toCount={TO_COUNT}
        onClosed={vi.fn()}
      />,
    );

    const inputs = screen.getAllByRole('textbox');
    expect(inputs).toHaveLength(4); // 3 formas + 1 observação
    expect(screen.getByLabelText('Dinheiro (com o troco inicial)')).toHaveValue(
      '',
    );
    expect(screen.getByLabelText('PIX')).toHaveValue('');
    expect(screen.getByLabelText('Cartão Ton')).toHaveValue('');
    expect(screen.getByLabelText('Observação')).toHaveValue('');

    // Contagem cega: não deve haver menção a esperado
    expect(screen.queryByText(/esperado/i)).toBeNull();
  });

  it('Enter navega entre os campos e da Observação leva à tecla sem gravar sozinho', async () => {
    const user = userEvent.setup();
    const fakeCash = new FakeDrawerCashApi();
    render(
      <DrawerCountForm
        cash={fakeCash as unknown as CashApi}
        toCount={TO_COUNT}
        onClosed={vi.fn()}
      />,
    );

    const dinheiroInput = screen.getByLabelText(
      'Dinheiro (com o troco inicial)',
    );
    const pixInput = screen.getByLabelText('PIX');
    const tonInput = screen.getByLabelText('Cartão Ton');
    const obsInput = screen.getByLabelText('Observação');
    const submitButton = screen.getByRole('button', {
      name: 'Conferir e fechar',
    });

    dinheiroInput.focus();
    expect(dinheiroInput).toHaveFocus();

    await user.keyboard('{Enter}');
    expect(pixInput).toHaveFocus();

    await user.keyboard('{Enter}');
    expect(tonInput).toHaveFocus();

    await user.keyboard('{Enter}');
    expect(obsInput).toHaveFocus();

    await user.keyboard('{Enter}');
    expect(submitButton).toHaveFocus();

    // Enter na observação não deve disparar o fechamento
    expect(fakeCash.closeCallCount).toBe(0);
  });

  it('campo inválido ou vazio exibe erro e não chama a API', async () => {
    const user = userEvent.setup();
    const fakeCash = new FakeDrawerCashApi();
    render(
      <DrawerCountForm
        cash={fakeCash as unknown as CashApi}
        toCount={TO_COUNT}
        onClosed={vi.fn()}
      />,
    );

    const submitButton = screen.getByRole('button', {
      name: 'Conferir e fechar',
    });

    // Submissão com campos vazios
    await user.click(submitButton);
    expect(fakeCash.closeCallCount).toBe(0);
    expect(
      screen.getByText('Falta a contagem de: Dinheiro'),
    ).toBeInTheDocument();

    // Preenche Dinheiro mas deixa PIX inválido
    await user.type(
      screen.getByLabelText('Dinheiro (com o troco inicial)'),
      '30,00',
    );
    await user.type(screen.getByLabelText('PIX'), 'invalido');
    await user.click(submitButton);
    expect(fakeCash.closeCallCount).toBe(0);
    expect(
      screen.getByText(
        'Valor inválido em PIX: recebido "invalido", esperado valor em reais (ex.: 12,50)',
      ),
    ).toBeInTheDocument();
  });

  it('grava com o corpo certo e chama onClosed no sucesso', async () => {
    const user = userEvent.setup();
    const fakeCash = new FakeDrawerCashApi();
    const onClosed = vi.fn();
    render(
      <DrawerCountForm
        cash={fakeCash as unknown as CashApi}
        toCount={TO_COUNT}
        onClosed={onClosed}
      />,
    );

    await user.type(
      screen.getByLabelText('Dinheiro (com o troco inicial)'),
      '40',
    );
    await user.type(screen.getByLabelText('PIX'), '150,50');
    await user.type(screen.getByLabelText('Cartão Ton'), '80');
    await user.type(screen.getByLabelText('Observação'), 'Tirei 10 para o pão');

    await user.click(screen.getByRole('button', { name: 'Conferir e fechar' }));

    await waitFor(() => expect(fakeCash.closeCallCount).toBe(1));
    expect(fakeCash.closePayload).toEqual({
      counts: [
        { paymentMethodId: 1, amount: '40.00' },
        { paymentMethodId: 2, amount: '150.50' },
        { paymentMethodId: 3, amount: '80.00' },
      ],
      note: 'Tirei 10 para o pão',
    });
    expect(onClosed).toHaveBeenCalledTimes(1);
  });

  it('exibe erro retornado pela API e destrava o botão', async () => {
    const user = userEvent.setup();
    const fakeCash = new FakeDrawerCashApi();
    fakeCash.closeError = new Error('Falha ao gravar no servidor');

    render(
      <DrawerCountForm
        cash={fakeCash as unknown as CashApi}
        toCount={TO_COUNT}
        onClosed={vi.fn()}
      />,
    );

    await user.type(
      screen.getByLabelText('Dinheiro (com o troco inicial)'),
      '30',
    );
    await user.type(screen.getByLabelText('PIX'), '100');
    await user.type(screen.getByLabelText('Cartão Ton'), '50');

    const submitButton = screen.getByRole('button', {
      name: 'Conferir e fechar',
    });
    await user.click(submitButton);

    expect(
      await screen.findByText('Falha ao gravar no servidor'),
    ).toBeInTheDocument();
    expect(submitButton).not.toBeDisabled();
  });

  it('trava o botão quando blocked é true', () => {
    const fakeCash = new FakeDrawerCashApi();
    render(
      <DrawerCountForm
        cash={fakeCash as unknown as CashApi}
        toCount={TO_COUNT}
        onClosed={vi.fn()}
        blocked={true}
      />,
    );
    expect(
      screen.getByRole('button', { name: 'Conferir e fechar' }),
    ).toBeDisabled();
  });
});
