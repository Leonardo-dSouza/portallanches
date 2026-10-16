import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { FakeApiClient } from '../test-support/fake-api-client';
import { orderFixture } from '../test-support/order-fixture';
import {
  addOrderByKeyboard,
  renderCashier,
} from '../test-support/render-cashier';

/** Linhas de pedido da tabela (sem o cabeçalho). */
const orderRows = () => screen.getAllByRole('row').slice(1);

describe('CashierPage: lista com número, hora e status (2026-10-10)', () => {
  it('a lista só mostra o status; muda no pop-up do pedido (Enter marca a próxima etapa)', async () => {
    await renderCashier();
    await addOrderByKeyboard();
    const [row] = await screen.findAllByRole('row').then((r) => r.slice(1));
    expect(row).toHaveTextContent('#1');
    expect(row).toHaveTextContent('20:41');
    expect(
      within(row).getByRole('list', { name: 'Andamento do #1: Em preparo' }),
    ).toHaveTextContent('PreparoEntregue');
    expect(within(row).queryByRole('button', { name: /Marcar/ })).toBeNull();
    await userEvent.click(
      within(row).getByRole('button', { name: 'Ver pedido #1' }),
    );
    const dialog = screen.getByRole('dialog');
    const next = within(dialog).getByRole('button', {
      name: 'Marcar como Entregue',
    });
    expect(next).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    expect(
      await within(dialog).findByRole('list', {
        name: 'Andamento do #1: Entregue',
      }),
    ).toBeInTheDocument();
    expect(
      within(orderRows()[0]).getByRole('list', {
        name: 'Andamento do #1: Entregue',
      }),
    ).toBeInTheDocument();
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Voltar um passo' }),
    );
    expect(
      await within(dialog).findByRole('button', {
        name: 'Marcar como Entregue',
      }),
    ).toBeInTheDocument();
  });

  it('a entrega passa por Saiu; a etapa atual é a marcada na trilha', async () => {
    const api = new FakeApiClient();
    api.orders = [orderFixture({ id: 1, dayNumber: 1, type: 'DELIVERY' })];
    await renderCashier(api);
    const track = await screen.findByRole('list', {
      name: 'Andamento do #1: Em preparo',
    });
    expect(within(track).getByText('Preparo')).toHaveAttribute(
      'aria-current',
      'step',
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Ver pedido #1' }),
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Marcar como Saiu' }),
    );
    expect(
      await screen.findByRole('button', { name: 'Marcar como Entregue' }),
    ).toBeInTheDocument();
    expect(api.calls).toContainEqual({
      method: 'POST',
      path: '/orders/1/status/next',
      body: { from: 'PREPARING' },
    });
  });

  it('outra tela já mudou o status: 409 avisa no pop-up e a lista recarrega', async () => {
    const api = new FakeApiClient();
    api.orders = [orderFixture({ id: 1, dayNumber: 1 })];
    await renderCashier(api);
    await userEvent.click(
      await screen.findByRole('button', { name: 'Ver pedido #1' }),
    );
    api.orders = [{ ...api.orders[0], status: 'DELIVERED' }];
    const dialog = screen.getByRole('dialog');
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Marcar como Entregue' }),
    );
    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      'já está em DELIVERED',
    );
    expect(
      await within(dialog).findByRole('list', {
        name: 'Andamento do #1: Entregue',
      }),
    ).toBeInTheDocument();
  });

  it('mostra há quanto tempo o pedido está na etapa', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-09-22T23:53:00Z'));
    try {
      const api = new FakeApiClient();
      api.orders = [orderFixture({ id: 1, dayNumber: 1 })];
      await renderCashier(api);
      expect(await screen.findByText('há 12 min')).toBeInTheDocument();
      // Entregue não mostra mais o tempo.
      await userEvent.click(
        screen.getByRole('button', { name: 'Ver pedido #1' }),
      );
      await userEvent.click(
        screen.getByRole('button', { name: 'Marcar como Entregue' }),
      );
      await screen.findByRole('button', { name: 'Voltar um passo' });
      expect(screen.queryByText(/^há /)).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('colunas na ordem: #, cliente e pagamento, itens, status, valor', async () => {
    await renderCashier();
    await addOrderByKeyboard();
    await screen.findAllByRole('row');
    expect(
      screen.getAllByRole('columnheader').map((th) => th.textContent),
    ).toEqual(['#', 'Cliente e pagamento', 'Itens', 'Status', 'Valor', '']);
  });

  it('filtros com contagem; "A pagar" mostra só a conta aberta, com a etiqueta', async () => {
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
      await screen.findByRole('button', { name: /^A pagar/ }),
    );
    expect(screen.getByRole('button', { name: /^A pagar/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(orderRows()).toHaveLength(1);
    expect(orderRows()[0]).toHaveTextContent('Maria');
    expect(within(orderRows()[0]).getByText('A pagar')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /^Em preparo/ }));
    expect(orderRows()).toHaveLength(1);
    await userEvent.click(screen.getByRole('button', { name: /^Todos/ }));
    expect(orderRows()).toHaveLength(2);
  });

  it('filtro sem pedido mostra um aviso no lugar da tabela', async () => {
    const api = new FakeApiClient();
    api.orders = [orderFixture({ status: 'DELIVERED' })];
    await renderCashier(api);
    await userEvent.click(
      await screen.findByRole('button', { name: /^A pagar/ }),
    );
    expect(screen.getByText('Nenhum pedido neste filtro.')).toBeInTheDocument();
  });
});
