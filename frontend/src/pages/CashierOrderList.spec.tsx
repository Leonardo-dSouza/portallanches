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
  it('mostra o número e a hora; a tecla da próxima etapa avança e a seta volta', async () => {
    await renderCashier();
    await addOrderByKeyboard();
    const [row] = await screen.findAllByRole('row').then((r) => r.slice(1));
    expect(row).toHaveTextContent('#1');
    expect(row).toHaveTextContent('20:41');
    expect(
      within(row).getByRole('list', { name: 'Andamento do #1: Em preparo' }),
    ).toHaveTextContent('PreparoEntregue');
    await userEvent.click(
      within(row).getByRole('button', { name: 'Marcar o #1 como Entregue' }),
    );
    expect(
      await within(orderRows()[0]).findByRole('list', {
        name: 'Andamento do #1: Entregue',
      }),
    ).toBeInTheDocument();
    await userEvent.click(
      within(orderRows()[0]).getByRole('button', {
        name: 'Voltar o status do #1',
      }),
    );
    expect(
      await within(orderRows()[0]).findByRole('button', {
        name: 'Marcar o #1 como Entregue',
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
      screen.getByRole('button', { name: 'Marcar o #1 como Saiu' }),
    );
    expect(
      await screen.findByRole('button', { name: 'Marcar o #1 como Entregue' }),
    ).toBeInTheDocument();
    expect(api.calls).toContainEqual({
      method: 'POST',
      path: '/orders/1/status/next',
      body: { from: 'PREPARING' },
    });
  });

  it('outra tela já mudou o status: 409 avisa e a lista recarrega', async () => {
    const api = new FakeApiClient();
    api.orders = [orderFixture({ id: 1, dayNumber: 1 })];
    await renderCashier(api);
    await screen.findByRole('button', { name: 'Marcar o #1 como Entregue' });
    api.orders = [{ ...api.orders[0], status: 'DELIVERED' }];
    await userEvent.click(
      screen.getByRole('button', { name: 'Marcar o #1 como Entregue' }),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'já está em DELIVERED',
    );
    expect(
      await screen.findByRole('list', { name: 'Andamento do #1: Entregue' }),
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
