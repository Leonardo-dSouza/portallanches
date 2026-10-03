import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiContext } from '../api/api-context';
import type { Order, Product } from '../api/types';
import { FakeAuth } from '../test-support/FakeAuth';
import { FakeApiClient } from '../test-support/fake-api-client';
import { CashierPage } from './CashierPage';

const product = (
  id: number,
  name: string,
  categoryName: string,
  menuNumber: number | null,
  salePrice: string,
): Product => ({
  id,
  name,
  categoryName,
  categoryId: 1,
  menuNumber,
  salePrice,
  active: true,
  description: null,
  components: [],
  cmv: '0.00',
  cmvComplete: true,
  cmvPercent: null,
});

/** Cardápio dos testes: 9 tradicional e 9 artesanal (mesmo número), e bebidas sem número. */
const MENU: Product[] = [
  product(1, 'X Salada', 'Tradicional', 9, '17.80'),
  product(2, 'X Salada', 'Artesanal', 9, '25.90'),
  product(5, 'Coca Cola 600ml', 'Refrigerantes', null, '7.00'),
  product(6, 'Coca Cola 2l', 'Refrigerantes', null, '12.00'),
];

async function renderCashier(api = new FakeApiClient()) {
  if (api.products.length === 0) api.products = MENU;
  render(
    <ApiContext.Provider value={api}>
      <FakeAuth role={api.role}>
        <CashierPage />
      </FakeAuth>
    </ApiContext.Provider>,
  );
  await screen.findByRole('heading', { name: 'Caixa de 22/09/2026 - Terça' });
  return api;
}

const type = (label: string, text: string) =>
  userEvent.type(screen.getByLabelText(label), text);
const click = (name: string) =>
  userEvent.click(screen.getByRole('button', { name }));
const postedBodies = (api: FakeApiClient, path: string) =>
  api.calls
    .filter((c) => c.method === 'POST' && c.path === path)
    .map((c) => c.body);

async function fillCustomer(name: string, street: string) {
  await type('Nome do cliente', name);
  await type('Rua', street);
}

/**
 * Lança só pelo teclado, como no fim da noite: itens (cada um com Enter), Enter com o campo
 * vazio vai para o pagamento, a tecla 1 escolhe PIX e Enter salva.
 */
async function addOrderByKeyboard(items = '9{Enter}') {
  await userEvent.click(screen.getByLabelText('Item'));
  await userEvent.keyboard(`${items}{Enter}1{Enter}`);
}

const ONE_X_SALADA = [{ productId: 1, quantity: 1 }];

describe('CashierPage: pedidos', () => {
  it('lança pelo teclado: número, artesanal com ponto, quantidade, busca e "+"', async () => {
    const api = await renderCashier();
    expect(screen.getByLabelText('Item')).toHaveFocus();
    await userEvent.keyboard('9{Enter}9.{Enter}2*coca 6');
    expect(screen.getByRole('option', { selected: true })).toHaveTextContent(
      'Coca Cola 600ml',
    );
    await userEvent.keyboard('{Enter}+');
    expect(screen.getByText('3×')).toBeInTheDocument();
    await userEvent.keyboard('{Enter}1{Enter}');
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
      screen.getByText('X Salada, X Salada (art.), 3× Coca Cola 600ml'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Item')).toHaveFocus();
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

  it('sem itens avisa e não chama a API', async () => {
    const api = await renderCashier();
    await userEvent.keyboard('{Enter}1{Enter}');
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
    expect(screen.getByLabelText('Item')).toHaveFocus();
    await userEvent.keyboard('9{Enter}');
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
      { name: 'Ana', phone: null, street: 'Rua A', deliveryZoneId: 100 },
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
    await userEvent.keyboard('{Enter}1{Enter}');
    await screen.findByText('Ana');
    expect(screen.getByLabelText('Balcão')).toBeChecked();
    expect(screen.getByLabelText('Item')).toHaveFocus();
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
        deliveryZoneId: 1,
      },
      {
        id: 8,
        name: 'Bia',
        phone: null,
        street: 'Avenida Brasil',
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
    await userEvent.keyboard('+');
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

  it('dia fechado bloqueia o lançamento e as ações', async () => {
    const api = new FakeApiClient();
    api.closingStatus = 'CLOSED';
    await renderCashier(api);
    expect(screen.getByText(/Dia fechado/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Salvar pedido' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Reabrir dia' })).toBeNull();
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

describe('CashierPage: gastos e fechamento', () => {
  it('lança gasto com tipo novo criando o tipo antes', async () => {
    const api = await renderCashier();
    await userEvent.click(screen.getByRole('tab', { name: 'Gastos' }));
    await type('Tipo', 'Embalagens');
    await type('Valor', '35,90');
    await click('Adicionar gasto');
    expect(await screen.findByText('R$ 35,90')).toBeInTheDocument();
    expect(postedBodies(api, '/expense-types')).toEqual([
      { name: 'Embalagens' },
    ]);
    expect(postedBodies(api, '/expenses')).toEqual([
      { amount: '35.90', expenseTypeId: 100 },
    ]);
  });

  it('gasto com tipo existente reaproveita o tipo, com observação', async () => {
    const api = await renderCashier();
    await userEvent.click(screen.getByRole('tab', { name: 'Gastos' }));
    await type('Tipo', 'gás');
    await type('Valor', '120');
    await type('Observação (opcional)', 'botijão');
    await click('Adicionar gasto');
    expect(await screen.findByText('botijão')).toBeInTheDocument();
    expect(postedBodies(api, '/expense-types')).toEqual([]);
    expect(postedBodies(api, '/expenses')).toEqual([
      { amount: '120.00', description: 'botijão', expenseTypeId: 1 },
    ]);
  });

  it('fecha o dia só após a confirmação e trava as abas', async () => {
    const api = await renderCashier();
    await userEvent.click(screen.getByRole('tab', { name: 'Relatório' }));
    await click('Fechar o dia');
    expect(api.lines).not.toContain('POST /closings/today/close');
    await click('Confirmar fechamento');
    expect(await screen.findByText('Fechado')).toBeInTheDocument();
    expect(api.lines).toContain('POST /closings/today/close');
    expect(screen.queryByRole('button', { name: 'Fechar o dia' })).toBeNull();
  });

  it('o relatório mostra os totais vindos da API', async () => {
    await renderCashier();
    await addOrderByKeyboard('9{Enter}');
    await screen.findByText('R$ 17,80');
    await userEvent.click(screen.getByRole('tab', { name: 'Relatório' }));
    const report = await screen.findByText(/Pedidos \(1\)/);
    expect(
      within(report.parentElement as HTMLElement).getByText('R$ 17,80'),
    ).toBeInTheDocument();
  });
});

describe('CashierPage: escolha de data', () => {
  it('trocar a data busca aquele dia e lança pedido nele', async () => {
    const api = await renderCashier();
    fireEvent.change(screen.getByLabelText('Data do caixa'), {
      target: { value: '2026-09-20' },
    });
    await screen.findByRole('heading', {
      name: 'Caixa de 20/09/2026 - Domingo',
    });
    expect(api.lines).toContain('GET /closings/today?date=2026-09-20');
    await addOrderByKeyboard();
    expect(api.lines).toContain('POST /orders?date=2026-09-20');
  });

  it('voltar para hoje remonta a tela sem data na query', async () => {
    const api = await renderCashier();
    fireEvent.change(screen.getByLabelText('Data do caixa'), {
      target: { value: '2026-09-20' },
    });
    await screen.findByRole('heading', {
      name: 'Caixa de 20/09/2026 - Domingo',
    });
    await click('Voltar para hoje');
    await screen.findByRole('heading', { name: 'Caixa de 22/09/2026 - Terça' });
    // O cardápio (GET /products) é a última leitura; a de gastos vem logo antes, sem data.
    expect(api.lines.at(-2)).toBe('GET /expenses/today');
  });

  it('data recusada pelo servidor mostra o erro e permite voltar para hoje', async () => {
    const api = new FakeApiClient();
    await renderCashier(api);
    api.rejectDate = '2026-08-01';
    fireEvent.change(screen.getByLabelText('Data do caixa'), {
      target: { value: '2026-08-01' },
    });
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'só acessa hoje',
    );
    await click('Voltar para hoje');
    await screen.findByRole('heading', { name: 'Caixa de 22/09/2026 - Terça' });
  });
});

describe('CashierPage: cadastros inativados pelo admin', () => {
  it('bairro inativo sai das sugestões, mas o pedido antigo mantém o nome', async () => {
    const api = new FakeApiClient();
    const base = { neighborhoodKey: '', fee: '3.00' };
    api.zones = [
      { id: 1, neighborhood: 'Monterrey', active: true, ...base },
      { id: 2, neighborhood: 'Antigo', active: false, ...base },
    ];
    api.orders = [
      {
        id: 1,
        type: 'DELIVERY',
        amount: '20.00',
        items: [],
        paymentMethodId: 1,
        deliveryZoneId: 2,
        deliveryFee: '2.00',
        customerId: null,
        customerName: null,
        customerPhone: null,
        customerStreet: null,
      },
    ] satisfies Order[];
    await renderCashier(api);
    expect(screen.getByText('Antigo')).toBeInTheDocument();
    await userEvent.click(screen.getByLabelText('Entrega'));
    const suggestions = [
      ...document.querySelectorAll('#delivery-zones option'),
    ].map((option) => option.getAttribute('value'));
    expect(suggestions).toEqual(['Monterrey']);
  });

  it('forma de pagamento inativa sai da lista do caixa, mas o pedido antigo mantém o nome', async () => {
    const api = new FakeApiClient();
    api.paymentMethods = [
      { id: 1, name: 'PIX', active: true, sortOrder: 0 },
      { id: 2, name: 'Vale antigo', active: false, sortOrder: 1 },
    ];
    api.orders = [
      {
        id: 1,
        type: 'COUNTER',
        amount: '20.00',
        items: [],
        paymentMethodId: 2,
        deliveryZoneId: null,
        deliveryFee: '0.00',
        customerId: null,
        customerName: null,
        customerPhone: null,
        customerStreet: null,
      },
    ] satisfies Order[];
    await renderCashier(api);
    expect(screen.getByText('Vale antigo')).toBeInTheDocument();
    const keys = within(screen.getByRole('group', { name: 'Pagamento' }))
      .getAllByRole('radio')
      .map((radio) => radio.getAttribute('aria-label'));
    expect(keys).toEqual(['PIX']);
  });
});
