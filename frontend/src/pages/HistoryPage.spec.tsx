import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ApiContext } from '../api/api-context';
import type { ClosingReport, PeriodReport } from '../api/types';
import { RequireAdmin } from '../components/RequireAdmin';
import { FakeApiClient } from '../test-support/fake-api-client';
import { FakeAuth } from '../test-support/FakeAuth';
import { HistoryPage } from './HistoryPage';

const TODAY = new Date(2026, 8, 22);

function day(date: string, total: string, status: 'OPEN' | 'CLOSED') {
  return {
    businessDate: date,
    status,
    orders: { count: 2, total },
    byPaymentMethod: [],
    withoutPaymentMethod: { count: 0, total: '0.00' },
    delivery: { count: 1, feesTotal: '3.00' },
    motoboy: { dailyRate: '40.00', deliveryFees: '3.00', totalCost: '43.00' },
    expenses: { count: 1, total: '10.00' },
  } satisfies ClosingReport;
}

function report(days: ClosingReport[]): PeriodReport {
  return {
    from: '2026-09-22',
    to: '2026-09-28',
    days,
    totals: {
      orders: { count: 4, total: '300.50' },
      byPaymentMethod: [],
      withoutPaymentMethod: { count: 0, total: '0.00' },
      delivery: { count: 2, feesTotal: '6.00' },
      motoboy: {
        dailyRates: '80.00',
        deliveryFees: '6.00',
        totalCost: '86.00',
      },
      expenses: { count: 2, total: '20.00' },
    },
  };
}

function renderHistory(api: FakeApiClient) {
  render(
    <ApiContext.Provider value={api}>
      <FakeAuth role="ADMIN">
        <HistoryPage today={TODAY} />
      </FakeAuth>
    </ApiContext.Provider>,
  );
}

const twoDays = () =>
  report([
    day('2026-09-22', '100.00', 'CLOSED'),
    day('2026-09-23', '200.50', 'OPEN'),
  ]);

describe('HistoryPage', () => {
  it('pede a semana de terça a segunda e mostra dias e totais da API', async () => {
    const api = new FakeApiClient();
    api.periodReport = twoDays();
    renderHistory(api);
    expect(await screen.findByText('ter 22/09')).toBeInTheDocument();
    expect(api.lines).toContain('GET /reports?from=2026-09-22&to=2026-09-28');
    expect(screen.getByText('R$ 100,00')).toBeInTheDocument();
    expect(screen.getByText('R$ 300,50')).toBeInTheDocument();
    expect(screen.getByText('Total do período')).toBeInTheDocument();
  });

  it('trocar para o mês busca o período do mês', async () => {
    const api = new FakeApiClient();
    api.periodReport = twoDays();
    renderHistory(api);
    await screen.findByText('ter 22/09');
    await userEvent.click(screen.getByLabelText('Este mês'));
    await waitFor(() =>
      expect(api.lines).toContain('GET /reports?from=2026-09-01&to=2026-09-30'),
    );
  });

  it('mostra estado vazio quando não há fechamentos', async () => {
    const api = new FakeApiClient();
    api.periodReport = report([]);
    renderHistory(api);
    expect(
      await screen.findByText('Nenhum fechamento no período'),
    ).toBeInTheDocument();
  });

  it('mostra o erro e tenta de novo', async () => {
    const api = new FakeApiClient();
    api.periodReport = twoDays();
    api.periodFails = true;
    renderHistory(api);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Falha ao gerar',
    );
    api.periodFails = false;
    await userEvent.click(
      screen.getByRole('button', { name: 'Tentar de novo' }),
    );
    expect(await screen.findByText('ter 22/09')).toBeInTheDocument();
  });

  it('reabre um dia fechado e a linha passa a Aberto', async () => {
    const api = new FakeApiClient();
    api.periodReport = twoDays();
    renderHistory(api);
    await userEvent.click(
      await screen.findByRole('button', { name: 'Reabrir 2026-09-22' }),
    );
    expect(
      await screen.findByRole('button', { name: 'Fechar 2026-09-22' }),
    ).toBeInTheDocument();
    expect(api.lines).toContain('POST /closings/2026-09-22/reopen');
  });

  it('fechar um dia aberto pede confirmação antes de chamar a API', async () => {
    const api = new FakeApiClient();
    api.periodReport = twoDays();
    renderHistory(api);
    await userEvent.click(
      await screen.findByRole('button', { name: 'Fechar 2026-09-23' }),
    );
    expect(api.lines).not.toContain('POST /closings/2026-09-23/close');
    await userEvent.click(
      screen.getByRole('button', { name: 'Confirmar fechamento 2026-09-23' }),
    );
    await waitFor(() =>
      expect(api.lines).toContain('POST /closings/2026-09-23/close'),
    );
  });

  it('período personalizado inválido mostra o problema e não chama a API', async () => {
    const api = new FakeApiClient();
    api.periodReport = twoDays();
    renderHistory(api);
    await screen.findByText('ter 22/09');
    await userEvent.click(screen.getByLabelText('Personalizado'));
    const before = api.calls.length;
    fireEvent.change(screen.getByLabelText('Até'), {
      target: { value: '2026-08-01' },
    });
    expect(await screen.findByRole('alert')).toHaveTextContent('2026-08-01');
    expect(api.calls.length).toBe(before);
  });
});

describe('RequireAdmin', () => {
  function renderAt(role: 'ADMIN' | 'CAIXA') {
    render(
      <FakeAuth role={role}>
        <MemoryRouter initialEntries={['/historico']}>
          <Routes>
            <Route element={<RequireAdmin />}>
              <Route path="/historico" element={<p>tela do admin</p>} />
            </Route>
            <Route path="/caixa" element={<p>tela do caixa</p>} />
          </Routes>
        </MemoryRouter>
      </FakeAuth>,
    );
  }

  it('deixa o admin entrar', () => {
    renderAt('ADMIN');
    expect(screen.getByText('tela do admin')).toBeInTheDocument();
  });

  it('manda o caixa de volta para /caixa', () => {
    renderAt('CAIXA');
    expect(screen.getByText('tela do caixa')).toBeInTheDocument();
  });
});
