import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { PHONE_QUERY } from '../cash/use-phone-layout';
import { FakeApiClient } from '../test-support/fake-api-client';
import { FakeMediaQueryList } from '../test-support/fake-media-query';
import { orderFixture } from '../test-support/order-fixture';
import { storedItem, storedLine } from '../test-support/order-menu';
import { click, renderCashier } from '../test-support/render-cashier';

/** Pedido #7 salvo com 1 X Salada (id 1, R$ 17,80). */
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

/** Pedido #7 no balcão e entra no modo acrescentar. */
async function startAddItem(api = apiWithOrder()) {
  await renderCashier(api);
  await userEvent.click(
    await screen.findByRole('button', { name: 'Acrescentar item' }),
  );
  return api;
}

describe('CashierPage: acrescentar item ao pedido (+ Item, 2026-11-08)', () => {
  it('abre no modo acrescentar com título, hora, linha destacada e itens só leitura', async () => {
    await startAddItem();
    expect(
      screen.getByRole('heading', {
        name: /^Acrescentar ao #7\s*lançado às\s*20:41/,
      }),
    ).toBeInTheDocument();

    const row = screen
      .getByRole('button', { name: 'Ver pedido #7' })
      .closest('tr');
    expect(row).toHaveAttribute('data-editing', 'true');

    // Itens atuais exibidos em lista só leitura
    const existing = screen.getByLabelText('Itens atuais');
    expect(within(existing).getByText(/1× X Salada/)).toBeInTheDocument();

    // Sem campos de tipo de pedido nem pagamento
    expect(screen.queryByRole('group', { name: 'Tipo do pedido' })).toBeNull();
    expect(screen.queryByRole('group', { name: 'Pagamento' })).toBeNull();
    expect(screen.queryByLabelText('Nome do cliente')).toBeNull();
  });

  it('o botão "+ Item" no pop-up fecha o diálogo e ativa o modo acrescentar', async () => {
    await renderCashier(apiWithOrder());
    await click('Ver pedido #7');
    const dialog = screen.getByRole('dialog', { name: '#7 Balcão' });
    expect(dialog).toBeInTheDocument();

    await userEvent.click(
      within(dialog).getByRole('button', { name: '+ Item' }),
    );
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(
      screen.getByRole('heading', { name: /^Acrescentar ao #7/ }),
    ).toBeInTheDocument();
  });

  it('não salva se nenhuma linha nova for informada e avisa na tela', async () => {
    const api = await startAddItem();
    await userEvent.click(
      screen.getByRole('button', { name: 'Salvar alterações' }),
    );

    expect(
      await screen.findByText('Digite o item a acrescentar'),
    ).toBeInTheDocument();
    expect(api.calls.filter((c) => c.method === 'PUT')).toHaveLength(0);
  });

  it('acrescenta item novo e salva com PUT juntando itens antigos + novos', async () => {
    const api = await startAddItem();
    await userEvent.click(screen.getByLabelText('Item'));
    await userEvent.keyboard('coca 6{Enter}');

    // Totais mostram a diferença
    expect(
      screen.getByText(/Antes R\$ 17,80 → agora R\$ 24,80 \(\+R\$ 7,00\)/),
    ).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole('button', { name: 'Salvar alterações' }),
    );

    await waitFor(() => {
      const putCall = api.calls.find((c) => c.method === 'PUT');
      expect(putCall).toBeDefined();
      expect(putCall?.path).toBe('/orders/7');
      const body = putCall?.body as { items: unknown[] };
      expect(body.items).toHaveLength(2);
    });

    // Volta para o formulário limpo de novo pedido
    expect(
      await screen.findByRole('heading', { name: 'Novo pedido' }),
    ).toBeInTheDocument();
  });

  it('tecla "Voltar" cancela o modo acrescentar sem alterar a API', async () => {
    const api = await startAddItem();
    await userEvent.click(screen.getByRole('button', { name: 'Voltar' }));

    expect(
      await screen.findByRole('heading', { name: 'Novo pedido' }),
    ).toBeInTheDocument();
    expect(api.calls.filter((c) => c.method === 'PUT')).toHaveLength(0);

    const row = screen
      .getByRole('button', { name: 'Ver pedido #7' })
      .closest('tr');
    expect(row).not.toHaveAttribute('data-editing');
  });

  it('"Limpar tudo" limpa apenas as linhas novas, preservando os itens originais', async () => {
    await startAddItem();
    await userEvent.click(screen.getByLabelText('Item'));
    await userEvent.keyboard('coca 6{Enter}');

    const lines = screen.getByRole('list', { name: 'Itens do pedido' });
    expect(within(lines).getByText('Coca Cola 600ml')).toBeInTheDocument();

    // Limpar tudo com confirmação
    await userEvent.click(screen.getByRole('button', { name: 'Limpar tudo' }));
    await userEvent.click(
      screen.getByRole('button', { name: 'Confirmar limpeza' }),
    );

    // Linhas novas sumiram, mas itens antigos continuam
    expect(
      screen.queryByRole('list', { name: 'Itens do pedido' }),
    ).not.toBeInTheDocument();
    const existing = screen.getByLabelText('Itens atuais');
    expect(within(existing).getByText(/1× X Salada/)).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /^Acrescentar ao #7/ }),
    ).toBeInTheDocument();
  });

  it('Enter com campos vazios salva direto quando há item novo', async () => {
    const api = await startAddItem();
    await userEvent.click(screen.getByLabelText('Item'));
    await userEvent.keyboard('coca 6{Enter}');

    // Com item adicionado, Enter no Qtd vai ao Item e novo Enter com ambos vazios salva direto
    await userEvent.keyboard('{Enter}{Enter}');

    await waitFor(() => {
      expect(api.calls.filter((c) => c.method === 'PUT')).toHaveLength(1);
    });
  });

  it('não mostra o botão "+ Item" quando o pedido está cancelado ou a noite fechada', async () => {
    const api = apiWithOrder();
    api.orders[0].canceledAt = '2026-09-22T21:00:00Z';
    api.orders[0].cancelReason = 'Desistiu';
    await renderCashier(api);

    expect(
      screen.queryByRole('button', { name: 'Acrescentar item' }),
    ).toBeNull();
  });
});

describe('CashierPage: acrescentar no celular (2026-11-08)', () => {
  let originalMatchMedia: typeof window.matchMedia;

  beforeEach(() => {
    originalMatchMedia = window.matchMedia;
    window.matchMedia = (query: string) =>
      new FakeMediaQueryList(query, query === PHONE_QUERY);
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  it('começa na tela MONTAR com faixa informativa e botão Voltar', async () => {
    await renderCashier(apiWithOrder());
    await userEvent.click(
      await screen.findByRole('button', { name: 'Acrescentar item' }),
    );

    expect(screen.getByText(/^Acrescentar ao #7/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Voltar' })).toBeInTheDocument();
    expect(
      screen.getByRole('list', { name: 'Itens do cardápio' }),
    ).toBeInTheDocument();

    // Clicar em voltar cancela e volta para o cardápio normal
    await userEvent.click(screen.getByRole('button', { name: 'Voltar' }));
    expect(screen.queryByText(/^Acrescentar ao #7/)).toBeNull();
  });
});
