import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FakeApiClient } from '../test-support/fake-api-client';
import { orderFixture } from '../test-support/order-fixture';
import {
  addOrderByKeyboard,
  renderCashier,
} from '../test-support/render-cashier';

/** Linhas de pedido da tabela (sem o cabeçalho). */
const orderRows = () => screen.getAllByRole('row').slice(1);

describe('CashierPage: lista com número, hora e status (2026-10-10)', () => {
  it('mostra o número e a hora; um clique avança o status e a seta volta', async () => {
    await renderCashier();
    await addOrderByKeyboard();
    const [row] = await screen.findAllByRole('row').then((r) => r.slice(1));
    expect(row).toHaveTextContent('#1');
    expect(row).toHaveTextContent('20:41');
    await userEvent.click(
      within(row).getByRole('button', { name: 'Status do #1: Em preparo' }),
    );
    expect(
      await within(orderRows()[0]).findByText('Entregue'),
    ).toBeInTheDocument();
    await userEvent.click(
      within(orderRows()[0]).getByRole('button', {
        name: 'Voltar o status do #1',
      }),
    );
    expect(
      await within(orderRows()[0]).findByRole('button', {
        name: 'Status do #1: Em preparo',
      }),
    ).toBeInTheDocument();
  });

  it('colunas na ordem: #, cliente e pagamento, itens, status, valor', async () => {
    await renderCashier();
    await addOrderByKeyboard();
    await screen.findAllByRole('row');
    expect(
      screen.getAllByRole('columnheader').map((th) => th.textContent),
    ).toEqual(['#', 'Cliente e pagamento', 'Itens', 'Status', 'Valor', '']);
  });

  it('filtros com contagem; "Abertos" mostra só a conta aberta, com a etiqueta', async () => {
    const api = new FakeApiClient();
    api.orders = [
      orderFixture({
        id: 1,
        dayNumber: 1,
        paymentMethodId: null,
        customerName: 'Maria',
      }),
      orderFixture({ id: 2, dayNumber: 2, status: 'DELIVERED' }),
    ];
    await renderCashier(api);
    await userEvent.click(
      await screen.findByRole('button', { name: /^Abertos/ }),
    );
    expect(screen.getByRole('button', { name: /^Abertos/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(orderRows()).toHaveLength(1);
    expect(orderRows()[0]).toHaveTextContent('Maria');
    expect(within(orderRows()[0]).getByText('Aberto')).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole('button', { name: /^Em andamento/ }),
    );
    expect(orderRows()).toHaveLength(1);
    await userEvent.click(screen.getByRole('button', { name: /^Todos/ }));
    expect(orderRows()).toHaveLength(2);
  });

  it('filtro sem pedido mostra um aviso no lugar da tabela', async () => {
    const api = new FakeApiClient();
    api.orders = [orderFixture({ status: 'DELIVERED' })];
    await renderCashier(api);
    await userEvent.click(
      await screen.findByRole('button', { name: /^Abertos/ }),
    );
    expect(screen.getByText('Nenhum pedido neste filtro.')).toBeInTheDocument();
  });
});
