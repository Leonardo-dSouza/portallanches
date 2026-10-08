import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ApiContext } from '../api/api-context';
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

const section = (name: string) =>
  screen.getByRole('region', { name }) as HTMLElement;

/** O visor aparece quando a análise chega. */
const visorFigure = async (name: string) =>
  within(await screen.findByRole('group', { name }));

describe('AnalyticsPage', () => {
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

  it('rankings, menos vendidos, bairros, clientes e pagamentos com o meio da maquininha', async () => {
    const api = new FakeApiClient();
    api.analyticsReport = fridayAnalytics();
    renderAnalytics(api);
    await visorFigure('Faturamento');
    const top = within(section('Lanches mais vendidos'));
    expect(top.getByText('X Salada')).toBeInTheDocument();
    expect(top.getByText('2 un')).toBeInTheDocument();
    expect(top.getByText('R$ 35,60')).toBeInTheDocument();
    expect(
      within(section('Lanches que menos vendem')).getByText('X Tudo'),
    ).toBeInTheDocument();
    expect(
      within(section('Bairros com mais entregas')).getByText('Centro'),
    ).toBeInTheDocument();
    expect(
      within(section('Clientes que mais pedem')).getByText('Ana'),
    ).toBeInTheDocument();
    const payments = within(section('Pagamentos'));
    expect(payments.getByText('Maquininha Tom (1)')).toBeInTheDocument();
    expect(payments.getByText('Débito (1)')).toBeInTheDocument();
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
      chart.getByRole('img', { name: 'sex 25/09: R$ 66,50 em 2 pedidos' }),
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
