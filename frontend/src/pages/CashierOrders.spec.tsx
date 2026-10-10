import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FakeApiClient } from '../test-support/fake-api-client';
import {
  addOrderByKeyboard,
  click,
  fillCustomer,
  ONE_X_SALADA,
  postedBodies,
  pressNumpad,
  renderCashier,
  type,
} from '../test-support/render-cashier';

describe('CashierPage: pedidos', () => {
  it('lança pelo teclado: número, artesanal com ponto, quantidade, busca e "+"', async () => {
    const api = await renderCashier();
    // O foco inicial vem de um efeito depois do cardápio carregar: com a suíte cheia, chega
    // depois do título do dia.
    await waitFor(() => expect(screen.getByLabelText('Qtd')).toHaveFocus());
    await userEvent.keyboard('{Enter}9{Enter}9.{Enter}2*coca 6');
    expect(screen.getByRole('option', { selected: true })).toHaveTextContent(
      'Coca Cola 600ml',
    );
    await userEvent.keyboard('{Enter}');
    pressNumpad('+');
    expect(screen.getByText('3×')).toBeInTheDocument();
    await userEvent.keyboard('{Enter}{Enter}1{Enter}');
    expect(postedBodies(api, '/orders')).toEqual([
      {
        items: [
          { productId: 1, quantity: 1 },
          { productId: 2, quantity: 1 },
          { productId: 5, quantity: 3 },
        ],
        type: 'COUNTER',
        paymentMethodId: 1,
      },
    ]);
    // 17,80 + 25,90 + 3 × 7,00, com o preço do cadastro (a API calcula).
    expect(await screen.findByText('R$ 64,70')).toBeInTheDocument();
    expect(
      screen.getByTitle('1× X Salada, 1× X Salada (art.), 3× Coca Cola 600ml'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Qtd')).toHaveFocus();
    expect(screen.getByLabelText('PIX')).not.toBeChecked();
  });

  it('a prévia mostra o item antes do Enter; número fora do cardápio avisa', async () => {
    const api = await renderCashier();
    await userEvent.keyboard('9.');
    expect(screen.getByText('Artesanal')).toBeInTheDocument();
    await userEvent.keyboard('{Backspace}{Backspace}99{Enter}');
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'O 99 não está no cardápio',
    );
    expect(screen.getByLabelText('Item')).toHaveValue('99');
    expect(postedBodies(api, '/orders')).toEqual([]);
  });

  it('clicar no item achado pelo número põe o item, como o Enter', async () => {
    await renderCashier();
    await userEvent.click(screen.getByLabelText('Item'));
    await userEvent.keyboard('9');
    await userEvent.click(screen.getByRole('option', { name: /X Salada/ }));
    expect(screen.getByLabelText('Item')).toHaveValue('');
    expect(
      screen.getByRole('button', { name: 'Mais um X Salada' }),
    ).toBeInTheDocument();
  });

  it('clicar na busca respeita a quantidade digitada', async () => {
    await renderCashier();
    await userEvent.click(screen.getByLabelText('Item'));
    await userEvent.keyboard('2*coca 6');
    await userEvent.click(
      screen.getByRole('option', { name: /Coca Cola 600ml/ }),
    );
    expect(screen.getByText('2×')).toBeInTheDocument();
  });

  it('sem itens avisa e não chama a API', async () => {
    const api = await renderCashier();
    await waitFor(() => expect(screen.getByLabelText('Qtd')).toHaveFocus());
    await userEvent.keyboard('{Enter}{Enter}1{Enter}');
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'pelo menos um item',
    );
    expect(postedBodies(api, '/orders')).toEqual([]);
  });

  it('F2 abre a entrega com o foco no Telefone; Ctrl+Enter salva de qualquer campo', async () => {
    const api = await renderCashier();
    await userEvent.keyboard('{F2}');
    expect(screen.getByLabelText('Telefone')).toHaveFocus();
    await userEvent.keyboard('{F2}');
    expect(screen.getByLabelText('Qtd')).toHaveFocus();
    await userEvent.keyboard('{Enter}9{Enter}');
    await userEvent.click(screen.getByLabelText('PIX'));
    await userEvent.keyboard('{Control>}{Enter}{/Control}');
    expect(postedBodies(api, '/orders')).toHaveLength(1);
  });

  it('entrega em bairro novo cadastra o bairro com a taxa e grava o pedido nele', async () => {
    const api = await renderCashier();
    await userEvent.click(screen.getByLabelText('Entrega'));
    await type('Bairro', 'Dunamis');
    expect(screen.getByText(/Bairro novo: "Dunamis"/)).toBeInTheDocument();
    await type('Taxa de entrega', '8');
    await fillCustomer('Ana', 'Rua A');
    expect(screen.getByText(/Cliente novo: "Ana"/)).toBeInTheDocument();
    await addOrderByKeyboard();
    expect(postedBodies(api, '/delivery-zones')).toEqual([
      { neighborhood: 'Dunamis', fee: '8.00' },
    ]);
    expect(postedBodies(api, '/customers')).toEqual([
      {
        name: 'Ana',
        phone: null,
        street: 'Rua A',
        number: '10',
        reference: null,
        deliveryZoneId: 100,
      },
    ]);
    expect(postedBodies(api, '/orders')).toEqual([
      {
        items: ONE_X_SALADA,
        type: 'DELIVERY',
        paymentMethodId: 1,
        customerId: 101,
      },
    ]);
    expect(await screen.findByText('Ana')).toBeInTheDocument();
  });

  it('bairro conhecido preenche a taxa padrão; taxa alterada vale só para o pedido', async () => {
    const api = await renderCashier();
    await userEvent.click(screen.getByLabelText('Entrega'));
    await type('Bairro', 'monterrey');
    expect(screen.getByLabelText('Taxa de entrega')).toHaveValue('3,00');
    await userEvent.clear(screen.getByLabelText('Taxa de entrega'));
    await type('Taxa de entrega', '4,5');
    await fillCustomer('Bia', 'Rua B');
    await addOrderByKeyboard();
    expect(postedBodies(api, '/delivery-zones')).toEqual([]);
    expect(postedBodies(api, '/orders')).toEqual([
      {
        items: ONE_X_SALADA,
        type: 'DELIVERY',
        paymentMethodId: 1,
        deliveryFee: '4.50',
        customerId: 100,
      },
    ]);
  });

  it('telefone conhecido preenche o cliente e reaproveita o cadastro', async () => {
    const api = new FakeApiClient();
    api.customers = [
      {
        id: 7,
        name: 'Ana',
        phone: '79999991234',
        street: 'Rua A',
        number: '12',
        reference: null,
        deliveryZoneId: 1,
      },
    ];
    await renderCashier(api);
    await userEvent.click(screen.getByLabelText('Entrega'));
    await type('Telefone', '(79) 99999-1234');
    await userEvent.tab();
    expect(await screen.findByLabelText('Nome do cliente')).toHaveValue('Ana');
    expect(screen.getByLabelText('Rua')).toHaveValue('Rua A');
    expect(screen.getByLabelText('Bairro')).toHaveValue('Monterrey');
    expect(screen.getByLabelText('Taxa de entrega')).toHaveValue('3,00');
    await addOrderByKeyboard();
    expect(api.lines).toContain('GET /customers?phone=79999991234');
    expect(api.lines.filter((l) => l.includes('/customers/7'))).toEqual([]);
    expect(postedBodies(api, '/customers')).toEqual([]);
    expect(postedBodies(api, '/orders')).toEqual([
      {
        items: ONE_X_SALADA,
        type: 'DELIVERY',
        paymentMethodId: 1,
        customerId: 7,
      },
    ]);
  });

  it('rua nova de cliente conhecido atualiza o cadastro', async () => {
    const api = new FakeApiClient();
    api.customers = [
      {
        id: 7,
        name: 'Ana',
        phone: '79999991234',
        street: 'Rua A',
        number: '12',
        reference: null,
        deliveryZoneId: 1,
      },
    ];
    await renderCashier(api);
    await userEvent.click(screen.getByLabelText('Entrega'));
    await type('Telefone', '79999991234');
    await userEvent.tab();
    await screen.findByDisplayValue('Rua A');
    await userEvent.clear(screen.getByLabelText('Rua'));
    await type('Rua', 'Rua Nova');
    await addOrderByKeyboard();
    const put = api.calls.find((c) => c.method === 'PUT');
    expect(put).toEqual({
      method: 'PUT',
      path: '/customers/7',
      body: {
        name: 'Ana',
        phone: '79999991234',
        street: 'Rua Nova',
        number: '12',
        reference: null,
        deliveryZoneId: 1,
      },
    });
  });

  it('na entrega o cliente vem antes dos itens; salvo, a comanda volta ao balcão', async () => {
    await renderCashier();
    await userEvent.click(screen.getByLabelText('Entrega'));
    const labels = [...document.querySelectorAll('.order-form label')].map(
      (label) => label.firstChild?.textContent,
    );
    expect(labels.indexOf('Rua')).toBeLessThan(labels.indexOf('Item'));
    expect(labels.indexOf('Telefone')).toBeLessThan(labels.indexOf('Item'));
    await type('Bairro', 'Monterrey');
    await fillCustomer('Ana', 'Rua A');
    // Total da comanda = itens + taxa do bairro (o que o cliente paga).
    await userEvent.click(screen.getByLabelText('Item'));
    await userEvent.keyboard('9{Enter}');
    expect(screen.getByText('R$ 20,80')).toBeInTheDocument();
    await userEvent.keyboard('{Enter}{Enter}1{Enter}');
    await screen.findByText('Ana');
    expect(screen.getByLabelText('Balcão')).toBeChecked();
    expect(screen.getByLabelText('Qtd')).toHaveFocus();
  });

  it('entrega sem o número da casa avisa e não grava', async () => {
    const api = await renderCashier();
    await userEvent.click(screen.getByLabelText('Entrega'));
    await type('Bairro', 'Monterrey');
    await fillCustomer('Ana', 'Rua A', '');
    await addOrderByKeyboard();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Informe o número da casa (ou S/N)',
    );
    expect(postedBodies(api, '/customers')).toEqual([]);
  });

  it('número e referência vão no cadastro; "sn" vira "S/N"', async () => {
    const api = await renderCashier();
    await userEvent.click(screen.getByLabelText('Entrega'));
    await type('Bairro', 'Monterrey');
    await fillCustomer('Ana', 'Rua A', 'sn');
    await type('Referência', 'casa azul');
    expect(screen.getByLabelText('Número')).toHaveValue('S/N');
    await addOrderByKeyboard();
    expect(postedBodies(api, '/customers')).toEqual([
      {
        name: 'Ana',
        phone: null,
        street: 'Rua A',
        number: 'S/N',
        reference: 'casa azul',
        deliveryZoneId: 1,
      },
    ]);
  });

  it('Enter num campo da entrega vai para o próximo, sem salvar', async () => {
    const api = await renderCashier();
    await userEvent.keyboard('{F2}79999990000{Enter}');
    expect(screen.getByLabelText('Nome do cliente')).toHaveFocus();
    expect(postedBodies(api, '/orders')).toEqual([]);
  });

  it('sugere as ruas do bairro e adota a grafia cadastrada', async () => {
    const api = new FakeApiClient();
    api.zones.push({
      id: 2,
      neighborhood: 'Centro',
      neighborhoodKey: 'centro',
      fee: '5.00',
      active: true,
    });
    api.customers = [
      {
        id: 7,
        name: 'Ana',
        phone: null,
        street: 'Rua Laranjeiras',
        number: '12',
        reference: null,
        deliveryZoneId: 1,
      },
      {
        id: 8,
        name: 'Bia',
        phone: null,
        street: 'Avenida Brasil',
        number: '12',
        reference: null,
        deliveryZoneId: 2,
      },
    ];
    await renderCashier(api);
    await userEvent.click(screen.getByLabelText('Entrega'));
    await type('Bairro', 'Monterrey');
    await waitFor(() =>
      expect(
        [...document.querySelectorAll('#street-suggestions option')].map(
          (option) => option.getAttribute('value'),
        ),
      ).toEqual(['Rua Laranjeiras']),
    );
    await type('Rua', 'r. laranjeiras');
    await userEvent.tab();
    expect(screen.getByLabelText('Rua')).toHaveValue('Rua Laranjeiras');
  });

  it('entrega sem nome do cliente não chama a API', async () => {
    const api = await renderCashier();
    await userEvent.click(screen.getByLabelText('Entrega'));
    await type('Bairro', 'Monterrey');
    await addOrderByKeyboard();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Informe o nome do cliente',
    );
    expect(postedBodies(api, '/orders')).toEqual([]);
  });

  it('edita um pedido (abre com as linhas) e apaga outro sem pedir confirmação', async () => {
    const api = await renderCashier();
    await addOrderByKeyboard('9{Enter}');
    await screen.findByText('R$ 17,80');
    await addOrderByKeyboard('9.{Enter}');
    await screen.findByText('R$ 25,90');
    await userEvent.click(
      (await screen.findAllByRole('button', { name: 'Editar' }))[0],
    );
    expect(screen.getByText('1×')).toBeInTheDocument();
    pressNumpad('+');
    await click('Mais um X Salada');
    await userEvent.click(screen.getByLabelText('PIX'));
    await click('Salvar alterações');
    expect(await screen.findByText('R$ 53,40')).toBeInTheDocument();
    await userEvent.click(screen.getAllByRole('button', { name: 'Apagar' })[1]);
    await waitFor(() =>
      expect(screen.queryByText('R$ 25,90')).not.toBeInTheDocument(),
    );
    expect(api.lines).toContain('DELETE /orders/101');
    expect(api.lines).toContain('PUT /orders/100');
  });

  it('dia fechado bloqueia o lançamento, e o caixa pode reabrir', async () => {
    const api = new FakeApiClient();
    api.closingStatus = 'CLOSED';
    await renderCashier(api);
    expect(screen.getByText(/Dia fechado/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Salvar pedido' })).toBeNull();
    await click('Reabrir dia');
    expect(
      await screen.findByRole('button', { name: 'Salvar pedido' }),
    ).toBeInTheDocument();
    expect(api.lines).toContain('POST /closings/2026-09-22/reopen');
  });

  it('caixa vê o motivo quando o dia não é o último fechado', async () => {
    const api = new FakeApiClient();
    api.closingStatus = 'CLOSED';
    api.reopenRefusal =
      'Perfil CAIXA só reabre o último dia com fechamento: esperado 2026-09-23, recebido 2026-09-22 (peça a um ADMIN)';
    await renderCashier(api);
    await click('Reabrir dia');
    expect(await screen.findByRole('alert')).toHaveTextContent(
      /só reabre o último dia/,
    );
  });

  it('admin reabre o dia fechado com um clique e o formulário volta', async () => {
    const api = new FakeApiClient();
    api.closingStatus = 'CLOSED';
    api.role = 'ADMIN';
    await renderCashier(api);
    await click('Reabrir dia');
    expect(
      await screen.findByRole('button', { name: 'Salvar pedido' }),
    ).toBeInTheDocument();
    expect(api.lines).toContain('POST /closings/2026-09-22/reopen');
  });
});
