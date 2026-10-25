import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ApiContext } from '../api/api-context';
import { AnalyticsPage } from '../pages/AnalyticsPage';
import type { FakeApiClient } from './fake-api-client';

/** "Hoje" dos testes da Análise: terça, 22/09/2026. */
const ANALYTICS_TODAY = new Date(2026, 8, 22);

/** A Análise com a API fake, aberta no caminho dado (`/analise?de=…&ate=…`). */
export function renderAnalytics(api: FakeApiClient, path = '/analise') {
  // A Análise é só do admin, e o fake só manda custo ao admin (2026-10-25).
  api.role = 'ADMIN';
  render(
    <ApiContext.Provider value={api}>
      <MemoryRouter initialEntries={[path]}>
        <AnalyticsPage today={ANALYTICS_TODAY} />
      </MemoryRouter>
    </ApiContext.Provider>,
  );
}
