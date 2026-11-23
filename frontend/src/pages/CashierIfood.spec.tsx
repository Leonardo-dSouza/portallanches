import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FakeApiClient } from '../test-support/fake-api-client';
import {
  MENU,
  ONE_X_SALADA,
  postedBodies,
  renderCashier,
} from '../test-support/render-cashier';

/** O X Salada tradicional custa 17,80 no balcão e 24,90 no iFood; a Coca 600 não está no iFood. */
async function cashierWithIfoodPrices() {
  const api = new FakeApiClient();
  api.products = MENU.map((p) =>
    p.id === 1 ? { ...p, ifoodPrice: '24.90' } : p,
  );
  await renderCashier(api);
  await waitFor(() => expect(screen.getByLabelText('Qtd')).toHaveFocus());
  return api;
}

// Pedido do iFood (2026-11-23): a tecla discreta, o preço do app e o corpo sem forma de pagamento.
describe('CashierPage: pedido do iFood', () => {
  it('lança pelo preço iFood, sem teclas de pagamento, e manda nome e nº', async () => {
    const api = await cashierWithIfoodPrices();
    await userEvent.click(screen.getByRole('radio', { name: 'iFood' }));
    expect(
      screen.getByRole('region', { name: 'Pedido iFood' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Pagamento' })).toBeNull();
    await userEvent.type(screen.getByLabelText('Cliente'), 'Mariana');
    await userEvent.type(screen.getByLabelText('Nº no iFood'), '4821');
    await userEvent.type(screen.getByLabelText('Item'), '9{Enter}');
    // Linha e total com o preço do app, não os 17,80 do balcão.
    expect(screen.getAllByText('R$ 24,90').length).toBeGreaterThan(0);
    expect(screen.queryByText('R$ 17,80')).toBeNull();
    await userEvent.click(
      screen.getByRole('button', { name: /Salvar pedido/ }),
    );
    await waitFor(() =>
      expect(postedBodies(api, '/orders')).toEqual([
        {
          items: ONE_X_SALADA,
          type: 'IFOOD',
          counterName: 'Mariana',
          ifoodCode: '4821',
        },
      ]),
    );
  });

  it('item sem preço iFood não aparece no pedido do iFood', async () => {
    await cashierWithIfoodPrices();
    await userEvent.click(screen.getByRole('radio', { name: 'iFood' }));
    await userEvent.type(screen.getByLabelText('Item'), 'coca');
    expect(screen.queryByText('Coca Cola 600ml')).toBeNull();
  });
});
