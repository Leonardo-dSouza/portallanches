import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { PaymentMethod } from '../api/types';
import { FakeApiClient } from '../test-support/fake-api-client';
import {
  ONE_X_SALADA,
  postedBodies,
  renderCashier,
} from '../test-support/render-cashier';

const method = (
  id: number,
  name: string,
  isCardTerminal = false,
): PaymentMethod => ({ id, name, active: true, sortOrder: id, isCardTerminal });

/** As teclas como na lanchonete: 1 Dinheiro, 2 PIX, 3 Tom, 4 PagBank. */
const METHODS = [
  method(1, 'Dinheiro'),
  method(2, 'PIX'),
  method(3, 'Maquininha Tom', true),
  method(4, 'Maquininha PagBank', true),
];

async function renderWithTerminals() {
  const api = new FakeApiClient();
  api.paymentMethods = METHODS;
  await renderCashier(api);
  await waitFor(() => expect(screen.getByLabelText('Item')).toHaveFocus());
  return api;
}

describe('CashierPage: maquininhas', () => {
  it('só pelo teclado: 3 escolhe a Tom, 1 o crédito e Enter salva', async () => {
    const api = await renderWithTerminals();
    await userEvent.keyboard('9{Enter}{Enter}3');
    expect(
      screen.getByRole('group', { name: 'Meio na Maquininha Tom' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Crédito')).toHaveFocus();
    await userEvent.keyboard('1{Enter}');
    expect(postedBodies(api, '/orders')).toEqual([
      {
        items: ONE_X_SALADA,
        type: 'COUNTER',
        paymentMethodId: 3,
        paymentMode: 'CREDIT',
      },
    ]);
    expect(
      await screen.findByText('Maquininha Tom · Crédito'),
    ).toBeInTheDocument();
  });

  it('maquininha sem o meio avisa e não grava', async () => {
    const api = await renderWithTerminals();
    await userEvent.keyboard('9{Enter}{Enter}4{Enter}');
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Escolha crédito, débito ou PIX na Maquininha PagBank',
    );
    expect(postedBodies(api, '/orders')).toEqual([]);
  });

  it('trocar a forma de pagamento limpa o meio escolhido', async () => {
    await renderWithTerminals();
    await userEvent.click(screen.getByLabelText('Maquininha Tom'));
    await userEvent.click(screen.getByLabelText('Débito'));
    await userEvent.click(screen.getByLabelText('Maquininha PagBank'));
    expect(screen.getByLabelText('Débito')).not.toBeChecked();
    await userEvent.click(screen.getByLabelText('Dinheiro'));
    expect(screen.queryByRole('group', { name: /Meio na/ })).toBeNull();
  });

  it('o relatório do dia mostra o subtotal de cada meio da maquininha', async () => {
    const api = new FakeApiClient();
    api.reportPayments = [
      {
        paymentMethodId: 3,
        name: 'Maquininha Tom',
        ordersCount: 3,
        total: '65.00',
        byMode: [
          { mode: 'CREDIT', ordersCount: 2, total: '45.00' },
          { mode: 'PIX', ordersCount: 1, total: '20.00' },
        ],
      },
    ];
    await renderCashier(api);
    await userEvent.click(screen.getByRole('tab', { name: 'Relatório' }));
    expect(await screen.findByText('Maquininha Tom (3)')).toBeInTheDocument();
    expect(screen.getByText('Crédito (2)')).toBeInTheDocument();
    expect(screen.getByText('R$ 45,00')).toBeInTheDocument();
    expect(screen.getByText('PIX (1)')).toBeInTheDocument();
  });
});
