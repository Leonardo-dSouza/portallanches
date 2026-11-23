import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FakeApiClient } from '../test-support/fake-api-client';
import {
  ONE_X_SALADA,
  postedBodies,
  renderCashier,
} from '../test-support/render-cashier';

/** Balcão com 1 X Salada (R$ 17,80) e a tecla 2 Dinheiro escolhida, foco no "Recebido". */
async function counterPaidInCash() {
  const api = new FakeApiClient();
  await renderCashier(api);
  await waitFor(() => expect(screen.getByLabelText('Qtd')).toHaveFocus());
  await userEvent.keyboard('{Enter}9{Enter}{Enter}{Enter}2');
  await waitFor(() => expect(screen.getByLabelText('Recebido')).toHaveFocus());
  return api;
}

// Pedido do usuário (2026-11-22): no balcão, ao escolher Dinheiro, o caixa vê o troco a dar.
// Só na tela: o balcão não grava troco (a API recusa changeFor em COUNTER).
describe('CashierPage: troco no balcão', () => {
  it('mostra o troco do que o cliente deu e salva sem mandar o recebido', async () => {
    const api = await counterPaidInCash();
    await userEvent.keyboard('50');
    expect(screen.getByRole('status', { name: 'Troco' })).toHaveTextContent(
      'Troco R$ 32,20',
    );
    await userEvent.keyboard('{Enter}');
    await waitFor(() =>
      expect(postedBodies(api, '/orders')).toEqual([
        {
          items: ONE_X_SALADA,
          type: 'COUNTER',
          diningOption: 'TAKEAWAY',
          paymentMethodId: 2,
        },
      ]),
    );
  });

  it('avisa quanto falta quando o recebido não cobre o total', async () => {
    await counterPaidInCash();
    await userEvent.keyboard('10');
    expect(screen.getByRole('status', { name: 'Troco' })).toHaveTextContent(
      'Faltam R$ 7,80',
    );
  });

  it('sem nada digitado não mostra troco', async () => {
    await counterPaidInCash();
    expect(screen.queryByRole('status', { name: 'Troco' })).toBeNull();
  });
});
