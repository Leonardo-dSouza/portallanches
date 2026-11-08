import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FakeApiClient } from '../test-support/fake-api-client';
import { orderFixture } from '../test-support/order-fixture';
import { renderCashier } from '../test-support/render-cashier';

// Card 8 (2026-11-08): o A pagar recebe sem abrir o Editar, aparece no topo e segura o fechamento.

function apiWithOpenAccount(): FakeApiClient {
  const api = new FakeApiClient();
  api.orders = [
    orderFixture({
      id: 1,
      dayNumber: 1,
      paymentMethodId: null,
      customerName: 'Maria',
      amount: '35.20',
      status: 'DELIVERED',
    }),
    orderFixture({ id: 2, dayNumber: 2, amount: '10.00' }),
  ];
  return api;
}

const rowOf = (name: string) =>
  screen.getByRole('row', { name: new RegExp(name) }) as HTMLElement;

const paymentBodies = (api: FakeApiClient) =>
  api.calls
    .filter((call) => call.path === '/orders/1/payment')
    .map((call) => call.body);

describe('CashierPage: Receber o A pagar', () => {
  it('a linha do A pagar tem a etiqueta forte e o Receber; o Dinheiro pede o troco e Enter salva', async () => {
    const api = apiWithOpenAccount();
    await renderCashier(api);
    await screen.findByText('Maria');
    expect(within(rowOf('Maria')).getByText('A pagar')).toHaveAttribute(
      'data-tone',
      'open',
    );
    await userEvent.click(
      within(rowOf('Maria')).getByRole('button', { name: 'Receber' }),
    );
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('#1 · R$ 35,20')).toBeInTheDocument();
    await userEvent.keyboard('2');
    const change = within(dialog).getByLabelText('Troco para');
    expect(change).toHaveFocus();
    await userEvent.type(change, '50{Enter}');
    expect(paymentBodies(api)).toEqual([
      { paymentMethodId: 2, changeFor: '50.00' },
    ]);
    expect(await screen.findByText('Pago · Dinheiro')).toBeInTheDocument();
  });

  it('o pop-up do pedido também recebe, e a janela não oferece fiado', async () => {
    const api = apiWithOpenAccount();
    await renderCashier(api);
    await userEvent.click(
      await screen.findByRole('button', { name: 'Ver pedido #1' }),
    );
    await userEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: 'Receber pagamento',
      }),
    );
    const dialog = screen.getByRole('dialog');
    const keys = within(
      within(dialog).getByRole('group', { name: 'Pagamento' }),
    )
      .getAllByRole('radio')
      .map((radio) => radio.getAttribute('aria-label'));
    expect(keys).toEqual(['PIX', 'Dinheiro']);
    await userEvent.keyboard('1{Enter}');
    expect(paymentBodies(api)).toEqual([{ paymentMethodId: 1 }]);
  });

  it('o topo mostra o A pagar e leva ao filtro', async () => {
    await renderCashier(apiWithOpenAccount());
    const key = await screen.findByRole('button', {
      name: /A pagar: 1 · R\$ 35,20/,
    });
    await userEvent.click(key);
    const filters = screen.getByRole('group', { name: 'Filtrar pedidos' });
    expect(
      within(filters).getByRole('button', { name: /^A pagar/ }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByText('#2')).toBeNull();
  });

  it('o Relatório lista a conta aberta e trava o Fechar o dia', async () => {
    await renderCashier(apiWithOpenAccount());
    await userEvent.click(
      await screen.findByRole('tab', { name: /Relatório/ }),
    );
    expect(
      await screen.findByText(
        'Receba as contas A pagar antes de fechar o dia:',
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('#1 Maria · R$ 35,20')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Fechar o dia' })).toBeDisabled();
  });
});
