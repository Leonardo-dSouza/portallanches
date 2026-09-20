import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiContext } from '../api/api-context';
import { FakeApiClient } from '../test-support/fake-api-client';
import { CashierPage } from './CashierPage';

async function renderCashier(api = new FakeApiClient()) {
  render(
    <ApiContext.Provider value={api}>
      <CashierPage />
    </ApiContext.Provider>,
  );
  await screen.findByRole('heading', { name: 'Caixa de 22/09/2026' });
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

async function addCounterOrder(amount: string) {
  await type('Valor', amount);
  await userEvent.selectOptions(
    screen.getByLabelText('Forma de pagamento'),
    'PIX',
  );
  await click('Adicionar pedido');
}

describe('CashierPage: pedidos', () => {
  it('lança pedidos em sequência: mostra na lista, mantém o pagamento e volta ao valor', async () => {
    const api = await renderCashier();
    await addCounterOrder('25,5');
    expect(await screen.findByText('R$ 25,50')).toBeInTheDocument();
    expect(postedBodies(api, '/orders')).toEqual([
      { amount: '25.50', type: 'COUNTER', paymentMethodId: 1 },
    ]);
    expect(screen.getByLabelText('Valor')).toHaveValue('');
    expect(screen.getByLabelText('Valor')).toHaveFocus();
    expect(screen.getByLabelText('Forma de pagamento')).toHaveValue('1');
  });

  it('valor inválido mostra o erro e não chama a API', async () => {
    const api = await renderCashier();
    await addCounterOrder('R$ 25');
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Valor inválido "R$ 25"',
    );
    expect(postedBodies(api, '/orders')).toEqual([]);
  });

  it('entrega em bairro novo cadastra o bairro com a taxa e grava o pedido nele', async () => {
    const api = await renderCashier();
    await userEvent.click(screen.getByLabelText('Entrega'));
    await type('Bairro', 'Dunamis');
    expect(screen.getByText(/Bairro novo: "Dunamis"/)).toBeInTheDocument();
    await type('Taxa de entrega', '8');
    await addCounterOrder('40');
    expect(postedBodies(api, '/delivery-zones')).toEqual([
      { neighborhood: 'Dunamis', fee: '8.00' },
    ]);
    expect(postedBodies(api, '/orders')).toEqual([
      {
        amount: '40.00',
        type: 'DELIVERY',
        paymentMethodId: 1,
        deliveryZoneId: 100,
      },
    ]);
  });

  it('bairro conhecido preenche a taxa padrão; taxa alterada vale só para o pedido', async () => {
    const api = await renderCashier();
    await userEvent.click(screen.getByLabelText('Entrega'));
    await type('Bairro', 'monterrey');
    expect(screen.getByLabelText('Taxa de entrega')).toHaveValue('3,00');
    await userEvent.clear(screen.getByLabelText('Taxa de entrega'));
    await type('Taxa de entrega', '4,5');
    await addCounterOrder('30');
    expect(postedBodies(api, '/delivery-zones')).toEqual([]);
    expect(postedBodies(api, '/orders')).toEqual([
      {
        amount: '30.00',
        type: 'DELIVERY',
        paymentMethodId: 1,
        deliveryZoneId: 1,
        deliveryFee: '4.50',
      },
    ]);
  });

  it('edita um pedido e apaga outro sem pedir confirmação', async () => {
    const api = await renderCashier();
    await addCounterOrder('10');
    await addCounterOrder('20');
    await userEvent.click(
      (await screen.findAllByRole('button', { name: 'Editar' }))[0],
    );
    await userEvent.clear(screen.getByLabelText('Valor'));
    await type('Valor', '11');
    await click('Salvar alterações');
    expect(await screen.findByText('R$ 11,00')).toBeInTheDocument();
    await userEvent.click(screen.getAllByRole('button', { name: 'Apagar' })[1]);
    await waitFor(() =>
      expect(screen.queryByText('R$ 20,00')).not.toBeInTheDocument(),
    );
    expect(api.lines).toContain('DELETE /orders/101');
    expect(api.lines).toContain('PUT /orders/100');
  });

  it('dia fechado bloqueia o lançamento e as ações', async () => {
    const api = new FakeApiClient();
    api.closingStatus = 'CLOSED';
    await renderCashier(api);
    expect(screen.getByText(/Dia fechado/)).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Adicionar pedido' }),
    ).toBeNull();
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
    await addCounterOrder('25,50');
    await screen.findByText('R$ 25,50');
    await userEvent.click(screen.getByRole('tab', { name: 'Relatório' }));
    const report = await screen.findByText(/Pedidos \(1\)/);
    expect(
      within(report.parentElement as HTMLElement).getByText('R$ 25,50'),
    ).toBeInTheDocument();
  });
});
