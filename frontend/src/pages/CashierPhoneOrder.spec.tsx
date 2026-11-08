import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PHONE_QUERY } from '../cash/use-phone-layout';
import { FakeApiClient } from '../test-support/fake-api-client';
import { FakeMediaQueryList } from '../test-support/fake-media-query';
import { orderFixture } from '../test-support/order-fixture';
import { storedItem, storedLine } from '../test-support/order-menu';
import { postedBodies, renderCashier } from '../test-support/render-cashier';

describe('CashierPage: modo garçom no celular (Etapa 3a - 2026-11-05)', () => {
  let originalMatchMedia: typeof window.matchMedia;

  beforeEach(() => {
    // No celular (2026-11-05): injeta o fake media query para simular a viewport móvel
    // sem vazar para outros testes que dependem do desktop.
    originalMatchMedia = window.matchMedia;
    window.matchMedia = (query: string) =>
      new FakeMediaQueryList(query, query === PHONE_QUERY);
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  it('a grade de cardápio aparece e o campo Qtd não', async () => {
    await renderCashier();
    expect(
      screen.getByRole('list', { name: 'Itens do cardápio' }),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText('Qtd')).toBeNull();
    expect(screen.getByLabelText('Item')).toBeInTheDocument();
  });

  it('tocar num item duas vezes dá quantidade 2 e a barra mostra "2 itens" e o total', async () => {
    await renderCashier();
    const itemButton = screen.getByRole('button', {
      name: /^X Salada R\$ 17,80/,
    });

    await userEvent.click(itemButton);
    expect(
      screen.getByRole('button', { name: /Comanda: 1 item · R\$ 17,80/ }),
    ).toBeInTheDocument();

    await userEvent.click(itemButton);
    expect(
      screen.getByRole('button', { name: /Comanda: 2 itens · R\$ 35,60/ }),
    ).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('a busca filtra os itens de todas as categorias na grade', async () => {
    await renderCashier();
    expect(
      screen.getByRole('button', { name: /^X Salada R\$ 17,80/ }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /^Coca Cola 600ml/ }),
    ).toBeNull();

    await userEvent.type(screen.getByLabelText('Item'), 'coca');
    expect(
      screen.getByRole('button', { name: /^Coca Cola 600ml/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /^Coca Cola 2l/ }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /^X Salada R\$ 17,80/ }),
    ).toBeNull();
  });

  it('trocar de categoria exibe os itens correspondentes', async () => {
    await renderCashier();
    expect(
      screen.getByRole('button', { name: /^X Salada R\$ 17,80/ }),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole('tab', { name: 'Refrigerantes' }));
    expect(
      screen.getByRole('button', { name: /^Coca Cola 600ml/ }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /^X Salada R\$ 17,80/ }),
    ).toBeNull();

    await userEvent.click(screen.getByRole('tab', { name: 'Tradicional' }));
    expect(
      screen.getByRole('button', { name: /^X Salada R\$ 17,80/ }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /^Coca Cola 600ml/ }),
    ).toBeNull();
  });

  it('a barra abre a tela FECHAR e "← Cardápio" volta', async () => {
    await renderCashier();
    await userEvent.click(
      screen.getByRole('button', { name: /^X Salada R\$ 17,80/ }),
    );
    await userEvent.click(screen.getByRole('button', { name: /Comanda:/ }));

    expect(
      screen.getByRole('heading', { name: 'Fechar pedido' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Cardápio/ }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('list', { name: 'Itens do cardápio' }),
    ).toBeNull();

    await userEvent.click(screen.getByRole('button', { name: /Cardápio/ }));
    expect(
      screen.getByRole('list', { name: 'Itens do cardápio' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Fechar pedido' })).toBeNull();
  });

  it('salvar um pedido pago pelo celular chama a API com as linhas certas e volta à tela MONTAR', async () => {
    const api = new FakeApiClient();
    const scrollMock = vi.fn();
    window.HTMLElement.prototype.scrollIntoView = scrollMock;

    await renderCashier(api);
    await userEvent.click(
      screen.getByRole('button', { name: /^X Salada R\$ 17,80/ }),
    );
    await userEvent.click(screen.getByRole('button', { name: /Comanda:/ }));

    await userEvent.click(screen.getByLabelText('PIX'));
    await userEvent.click(screen.getByRole('button', { name: /^Salvar/ }));

    await waitFor(() => {
      expect(postedBodies(api, '/orders')).toEqual([
        {
          items: [{ productId: 1, quantity: 1 }],
          type: 'COUNTER',
          paymentMethodId: 1,
        },
      ]);
    });

    expect(
      await screen.findByRole('list', { name: 'Itens do cardápio' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Item')).toHaveValue('');
    await waitFor(() => {
      expect(scrollMock).toHaveBeenCalledWith({
        behavior: 'smooth',
        block: 'start',
      });
    });
  });

  it('editar um pedido abre direto na tela FECHAR com o título visível', async () => {
    const api = new FakeApiClient();
    api.orders = [
      orderFixture({
        id: 7,
        dayNumber: 7,
        amount: '17.80',
        items: [storedItem(storedLine('X Salada', 'Tradicional', 1, '17.80'))],
      }),
    ];

    await renderCashier(api);
    await userEvent.click(
      await screen.findByRole('button', { name: 'Editar' }),
    );

    expect(
      screen.getByRole('heading', { name: 'Editando #7' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Cardápio/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Salvar/ })).toBeInTheDocument();
    expect(
      screen.queryByRole('list', { name: 'Itens do cardápio' }),
    ).toBeNull();
  });
});
