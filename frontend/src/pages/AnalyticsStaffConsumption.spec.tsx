import { screen, within } from '@testing-library/react';
import {
  fridayAnalytics,
  weekAnalytics,
} from '../test-support/analytics-report';
import { FakeApiClient } from '../test-support/fake-api-client';
import { CONSUMED_AT } from '../test-support/fake-staff-consumptions';
import { storedItem, storedLine } from '../test-support/order-menu';
import { renderAnalytics } from '../test-support/render-analytics';

const DAY_PATH = '/analise?de=2026-09-25&ate=2026-09-25';
const WEEK_PATH = '/analise?de=2026-09-22&ate=2026-09-28';

const region = (name: string) =>
  within(screen.getByRole('region', { name }) as HTMLElement);

describe('Análise → consumo interno (2026-10-23)', () => {
  beforeEach(() => localStorage.clear());

  it('o dia lista cada consumo (hora, quem, itens e custo) e o resumo traz o custo à parte', async () => {
    const api = new FakeApiClient();
    api.analyticsReport = fridayAnalytics();
    api.staffConsumptions = [
      {
        id: 40,
        closingId: 10,
        createdById: 2,
        createdAt: CONSUMED_AT,
        consumerName: 'Bianca',
        items: [storedItem(storedLine('X Salada', 'Tradicional', 1, '17.80'))],
        cmvTotal: '7.00',
        missingCostCount: 0,
      },
    ];
    renderAnalytics(api, DAY_PATH);
    const day = within(
      await screen.findByRole('region', { name: 'Consumo interno do dia' }),
    );
    expect(day.getByText('Bianca')).toBeInTheDocument();
    expect(day.getByText('20:30')).toBeInTheDocument();
    expect(day.getByText('1× X Salada')).toBeInTheDocument();
    expect(day.getByText('R$ 7,00')).toBeInTheDocument();
    expect(region('Resumo do fechamento').getByText('Custo (1 lançamento)'));
    expect(api.lines).toContain('GET /closings/2026-09-25/staff-consumptions');
  });

  it('dia sem consumo diz que não houve', async () => {
    const api = new FakeApiClient();
    api.analyticsReport = fridayAnalytics();
    renderAnalytics(api, DAY_PATH);
    const day = within(
      await screen.findByRole('region', { name: 'Consumo interno do dia' }),
    );
    expect(day.getByText('Nenhum consumo interno nesse dia.'));
  });

  it('o período mostra o custo total, por pessoa e os itens mais consumidos', async () => {
    const api = new FakeApiClient();
    api.analyticsReport = {
      ...weekAnalytics(),
      staffConsumption: {
        count: 3,
        cmvTotal: '21.72',
        missingCostCount: 1,
        byPerson: [
          { name: 'Bianca', count: 2, cmvTotal: '15.57', missingCostCount: 0 },
          { name: 'Leo', count: 1, cmvTotal: '6.15', missingCostCount: 1 },
        ],
        topItems: [
          { name: 'Misto Quente', categoryName: 'Tradicional', quantity: 3 },
        ],
      },
    };
    renderAnalytics(api, WEEK_PATH);
    await screen.findByRole('region', { name: 'Consumo interno' });
    const block = region('Consumo interno');
    expect(block.getByText('R$ 21,72')).toBeInTheDocument();
    expect(block.getByText(/3 lançamentos/)).toBeInTheDocument();
    expect(block.getByText(/1 item sem custo/)).toBeInTheDocument();
    const people = block.getByRole('list', { name: 'Por pessoa' });
    expect(within(people).getAllByRole('listitem')[0]).toHaveTextContent(
      'Bianca',
    );
    expect(within(people).getAllByRole('listitem')[0]).toHaveTextContent(
      'R$ 15,57',
    );
    const items = block.getByRole('list', { name: 'Itens mais consumidos' });
    expect(within(items).getByText('Misto Quente')).toBeInTheDocument();
    expect(within(items).getByText('3 un')).toBeInTheDocument();
  });

  it('período sem consumo diz que não houve', async () => {
    const api = new FakeApiClient();
    api.analyticsReport = weekAnalytics();
    renderAnalytics(api, WEEK_PATH);
    await screen.findByRole('region', { name: 'Consumo interno' });
    expect(
      region('Consumo interno').getByText('Nenhum consumo interno no período.'),
    ).toBeInTheDocument();
  });
});
