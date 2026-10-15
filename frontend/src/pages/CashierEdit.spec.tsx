import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FakeApiClient } from '../test-support/fake-api-client';
import { orderFixture } from '../test-support/order-fixture';
import { storedItem, storedLine } from '../test-support/order-menu';
import { click, renderCashier } from '../test-support/render-cashier';

/** Pedido #7 salvo com 1 X Salada (o do cardápio de teste, id 1). */
function apiWithOrder(): FakeApiClient {
  const api = new FakeApiClient();
  api.orders = [
    orderFixture({
      id: 7,
      dayNumber: 7,
      amount: '17.80',
      items: [storedItem(storedLine('X Salada', 'Tradicional', 1, '17.80'))],
    }),
  ];
  return api;
}

async function editOrder7(api = apiWithOrder()) {
  await renderCashier(api);
  await userEvent.click(await screen.findByRole('button', { name: 'Editar' }));
  return api;
}

const lines = () => screen.getByRole('list', { name: 'Itens do pedido' });

describe('CashierPage: edição clara (2026-10-15)', () => {
  it('faixa "Editando #7" com a hora e a linha da lista destacada', async () => {
    await editOrder7();
    expect(
      screen.getByRole('heading', {
        name: /^Editando #7\s*lançado às\s*20:41/,
      }),
    ).toBeInTheDocument();
    const row = screen
      .getByRole('button', { name: 'Ver pedido #7' })
      .closest('tr');
    expect(row).toHaveAttribute('data-editing', 'true');
  });

  it('marca o que é novo, o +1, o que saiu (com Desfazer) e o antes → agora', async () => {
    await editOrder7();
    await userEvent.click(screen.getByLabelText('Item'));
    await userEvent.keyboard('coca 6{Enter}');
    expect(within(lines()).getAllByRole('listitem')[1]).toHaveTextContent(
      'novo',
    );
    await click('Mais um X Salada');
    expect(within(lines()).getAllByRole('listitem')[0]).toHaveTextContent('+1');
    expect(
      screen.getByText(/Antes R\$ 17,80 → agora R\$ 42,60 \(\+R\$ 24,80\)/),
    ).toBeInTheDocument();
    await click('Tirar X Salada');
    const removed = screen.getByRole('list', { name: 'Itens que saíram' });
    expect(removed).toHaveTextContent('1× X Salada');
    await click('Desfazer a saída de X Salada');
    expect(screen.queryByRole('list', { name: 'Itens que saíram' })).toBeNull();
    expect(within(lines()).getAllByRole('listitem')).toHaveLength(2);
  });

  it('baixar o valor fora da trava pede a senha do admin e repete o salvar com ela', async () => {
    const api = apiWithOrder();
    api.editNeedsManager = true;
    api.orders[0].items = [
      storedItem(storedLine('X Salada', 'Tradicional', 2, '17.80')),
    ];
    api.orders[0].amount = '35.60';
    await editOrder7(api);
    await click('Menos um X Salada');
    await userEvent.click(screen.getByLabelText('PIX'));
    await click('Salvar alterações');
    const dialog = await screen.findByRole('dialog', {
      name: 'Senha do admin',
    });
    expect(dialog).toHaveTextContent(/Salvar o #7: baixa o valor/);
    await userEvent.type(
      within(dialog).getByLabelText('Senha do admin', { selector: 'input' }),
      'admin123',
    );
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Autorizar' }),
    );
    await waitFor(() =>
      expect(
        api.calls.filter((call) => call.method === 'PUT').at(-1)?.body,
      ).toMatchObject({ managerPassword: 'admin123' }),
    );
    expect(
      await screen.findByRole('heading', { name: 'Novo pedido' }),
    ).toBeInTheDocument();
  });

  it('o pop-up também cancela o pedido', async () => {
    await renderCashier(apiWithOrder());
    await click('Ver pedido #7');
    await userEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: 'Cancelar pedido',
      }),
    );
    expect(
      screen.getByRole('dialog', { name: 'Cancelar #7 Balcão' }),
    ).toBeInTheDocument();
  });
});
