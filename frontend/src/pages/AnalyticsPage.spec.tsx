import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ApiContext } from '../api/api-context';
import type { OrderItem, PaymentMethod } from '../api/types';
import {
  fridayAnalytics,
  weekAnalytics,
} from '../test-support/analytics-report';
import { FakeApiClient } from '../test-support/fake-api-client';
import { AnalyticsPage } from './AnalyticsPage';

const TODAY = new Date(2026, 8, 22);

function renderAnalytics(api: FakeApiClient, path = '/analise') {
  render(
    <ApiContext.Provider value={api}>
      <MemoryRouter initialEntries={[path]}>
        <AnalyticsPage today={TODAY} />
      </MemoryRouter>
    </ApiContext.Provider>,
  );
}

const TOM: PaymentMethod = {
  id: 3,
  name: 'Maquininha Ton',
  active: true,
  sortOrder: 2,
  isCardTerminal: true,
};

const saladas = (quantity: number): OrderItem => ({
  productId: 1,
  productName: 'X Salada',
  menuNumber: 9,
  categoryName: 'Tradicional',
  quantity,
  unitPrice: '17.80',
  unitCmv: null,
  cmvComplete: false,
});

/** Sexta 25/09 com uma entrega da Ana (Ton, débito), um balcão no PIX e o gás do dia. */
function dayWithOrders(): FakeApiClient {
  const api = new FakeApiClient();
  api.analyticsReport = fridayAnalytics();
  api.paymentMethods = [...api.paymentMethods, TOM];
  const base = {
    items: [saladas(2)],
    customerPhone: null,
    paymentMode: null,
  };
  api.orders = [
    {
      ...base,
      id: 1,
      amount: '38.60',
      type: 'DELIVERY',
      paymentMethodId: 3,
      paymentMode: 'DEBIT',
      deliveryZoneId: 1,
      deliveryFee: '3.00',
      customerId: 7,
      customerName: 'Ana',
      customerStreet: 'Rua A',
      customerNumber: '123',
      customerReference: 'casa azul',
    },
    {
      ...base,
      id: 2,
      amount: '35.60',
      type: 'COUNTER',
      paymentMethodId: 1,
      deliveryZoneId: null,
      deliveryFee: '0.00',
      customerId: null,
      customerName: null,
      customerStreet: null,
      customerNumber: null,
      customerReference: null,
    },
  ];
  api.expenses = [
    { id: 1, expenseTypeId: 1, description: 'Botijão', amount: '120.00' },
  ];
  return api;
}

const section = (name: string) =>
  screen.getByRole('region', { name }) as HTMLElement;

/** O visor aparece quando a análise chega. */
const visorFigure = async (name: string) =>
  within(await screen.findByRole('group', { name }));

describe('AnalyticsPage', () => {
  // A escolha dos blocos fica no navegador: cada teste começa do padrão (tudo ligado).
  beforeEach(() => localStorage.clear());

  it('abre na semana e pede a análise do período', async () => {
    const api = new FakeApiClient();
    api.analyticsReport = weekAnalytics();
    renderAnalytics(api);
    const revenue = await visorFigure('Faturamento');
    expect(revenue.getByText('R$ 66,50')).toBeInTheDocument();
    expect(api.lines).toContain('GET /analytics?from=2026-09-22&to=2026-09-28');
    expect(screen.getByLabelText('Esta semana')).toBeChecked();
    expect(
      screen.getByText('Comparado com 15/09/2026 a 21/09/2026'),
    ).toBeInTheDocument();
  });

  it('o dia vindo do Histórico abre no período personalizado daquele dia', async () => {
    const api = new FakeApiClient();
    api.analyticsReport = fridayAnalytics();
    renderAnalytics(api, '/analise?de=2026-09-25&ate=2026-09-25');
    await visorFigure('Faturamento');
    expect(api.lines).toContain('GET /analytics?from=2026-09-25&to=2026-09-25');
    expect(screen.getByLabelText('Personalizado')).toBeChecked();
    expect(
      screen.getByText('Comparado com 18/09/2026 - Sexta'),
    ).toBeInTheDocument();
    // Um dia só: sem gráfico dia a dia nem médias por dia da semana.
    expect(
      screen.queryByRole('region', { name: 'Faturamento por noite' }),
    ).toBeNull();
  });

  it('o visor mostra a variação com seta e texto, não só cor', async () => {
    const api = new FakeApiClient();
    api.analyticsReport = fridayAnalytics();
    renderAnalytics(api);
    const revenue = within(
      await screen.findByRole('group', { name: 'Faturamento' }),
    );
    expect(revenue.getByText('R$ 66,50')).toBeInTheDocument();
    expect(revenue.getByText('100,0%')).toBeInTheDocument();
    expect(revenue.getByLabelText('subiu 100,0%')).toBeInTheDocument();
    const deliveries = within(screen.getByRole('group', { name: 'Entregas' }));
    expect(deliveries.getByText('sem base de comparação')).toBeInTheDocument();
  });

  it('rankings, bairros, clientes e pagamentos com o meio da maquininha', async () => {
    const api = new FakeApiClient();
    api.analyticsReport = fridayAnalytics();
    renderAnalytics(api);
    await visorFigure('Faturamento');
    const top = within(section('Lanches mais vendidos'));
    expect(top.getByText('X Salada')).toBeInTheDocument();
    expect(top.getByText('2 un')).toBeInTheDocument();
    expect(top.getByText('R$ 35,60')).toBeInTheDocument();
    expect(
      within(section('Bairros com mais entregas')).getByText('Centro'),
    ).toBeInTheDocument();
    expect(
      within(section('Clientes que mais pedem')).getByText('Ana'),
    ).toBeInTheDocument();
    const payments = within(section('Pagamentos'));
    expect(payments.getByText('Maquininha Ton (1)')).toBeInTheDocument();
    expect(payments.getByText('Débito (1)')).toBeInTheDocument();
  });

  it('sem o bloco de menos vendidos; clicar numa categoria abre os itens dela', async () => {
    const api = new FakeApiClient();
    api.analyticsReport = fridayAnalytics();
    renderAnalytics(api);
    await visorFigure('Faturamento');
    expect(
      screen.queryByRole('region', { name: 'Lanches que menos vendem' }),
    ).toBeNull();
    const categories = within(section('Vendas por categoria'));
    const traditional = categories.getByRole('button', { name: /Tradicional/ });
    expect(traditional).toHaveAttribute('aria-expanded', 'false');
    expect(categories.queryByText('X Salada')).toBeNull();
    await userEvent.click(traditional);
    expect(traditional).toHaveAttribute('aria-expanded', 'true');
    expect(categories.getByText('X Salada')).toBeInTheDocument();
  });

  it('a semana mostra o faturamento por noite, com tabela para leitor de tela', async () => {
    const api = new FakeApiClient();
    api.analyticsReport = weekAnalytics();
    renderAnalytics(api);
    const chart = within(
      await screen.findByRole('region', { name: 'Faturamento por noite' }),
    );
    const table = within(chart.getByRole('table'));
    expect(
      table.getByRole('row', { name: /ter 22\/09.*R\$ 20,00/ }),
    ).toBeInTheDocument();
    expect(
      chart.getByRole('link', { name: 'sex 25/09: R$ 66,50 em 2 pedidos' }),
    ).toHaveAttribute('href', '/analise?de=2026-09-25&ate=2026-09-25');
  });

  it('o dia mostra o fechamento só para ler: pedidos por tipo, gastos e resumo', async () => {
    const api = dayWithOrders();
    renderAnalytics(api, '/analise?de=2026-09-25&ate=2026-09-25');
    const orders = within(
      await screen.findByRole('region', { name: 'Pedidos do dia' }),
    );
    expect(orders.getByText('Entregas')).toBeInTheDocument();
    expect(orders.getByText('Balcão')).toBeInTheDocument();
    expect(orders.getByText('Ana')).toBeInTheDocument();
    expect(orders.getByText('Rua A, 123 · Monterrey')).toBeInTheDocument();
    expect(orders.getByText('casa azul')).toBeInTheDocument();
    expect(orders.getByText('taxa R$ 3,00')).toBeInTheDocument();
    expect(orders.getByText('Maquininha Ton · Débito')).toBeInTheDocument();
    expect(orders.getAllByText('2× X Salada')).toHaveLength(2);
    const expenses = within(section('Gastos do dia'));
    expect(expenses.getByText('Gás')).toBeInTheDocument();
    expect(expenses.getByText('Botijão')).toBeInTheDocument();
    expect(
      within(section('Resumo do fechamento')).getByText('Vendas'),
    ).toBeInTheDocument();
    expect(api.lines).toContain('GET /closings/2026-09-25/orders');
    expect(
      screen.queryAllByRole('button', { name: /Editar|Apagar|Reabrir/ }),
    ).toEqual([]);
  });

  it('dia sem caixa avisa no lugar do fechamento', async () => {
    const api = dayWithOrders();
    api.daysWithoutClosing = ['2026-09-25'];
    renderAnalytics(api, '/analise?de=2026-09-25&ate=2026-09-25');
    expect(
      await screen.findByText('Nenhum caixa nesse dia.'),
    ).toBeInTheDocument();
  });

  it('o dia da semana leva ao Histórico só com aqueles dias do período', async () => {
    const api = new FakeApiClient();
    api.analyticsReport = weekAnalytics();
    renderAnalytics(api);
    const weekdays = within(
      await screen.findByRole('region', { name: 'Dias da semana' }),
    );
    expect(
      weekdays.getByRole('link', { name: 'Ver as sextas no Histórico' }),
    ).toHaveAttribute('href', '/historico?de=2026-09-22&ate=2026-09-28&dia=5');
  });

  it('desligar um bloco esconde a seção, e a escolha vale ao abrir a tela de novo', async () => {
    const api = new FakeApiClient();
    api.analyticsReport = weekAnalytics();
    renderAnalytics(api);
    await visorFigure('Faturamento');
    const neighborhoods = screen.getByRole('switch', { name: 'Bairros' });
    expect(neighborhoods).toHaveAttribute('aria-checked', 'true');
    await userEvent.click(neighborhoods);
    expect(
      screen.queryByRole('region', { name: 'Bairros com mais entregas' }),
    ).toBeNull();
    cleanup();
    renderAnalytics(api);
    await visorFigure('Faturamento');
    expect(screen.getByRole('switch', { name: 'Bairros' })).toHaveAttribute(
      'aria-checked',
      'false',
    );
    expect(
      screen.queryByRole('region', { name: 'Bairros com mais entregas' }),
    ).toBeNull();
    expect(
      screen.getByRole('region', { name: 'Clientes que mais pedem' }),
    ).toBeInTheDocument();
  });

  it('falha da API mostra o motivo e deixa tentar de novo', async () => {
    const api = new FakeApiClient();
    renderAnalytics(api);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Falha ao gerar a análise',
    );
    api.analyticsReport = fridayAnalytics();
    await userEvent.click(
      screen.getByRole('button', { name: 'Tentar de novo' }),
    );
    expect(await screen.findByText('R$ 66,50')).toBeInTheDocument();
  });
});
