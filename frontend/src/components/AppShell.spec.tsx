import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ApiContext } from '../api/api-context';
import type { UserRole } from '../api/types';
import { FakeApiClient } from '../test-support/fake-api-client';
import { FakeAuth } from '../test-support/FakeAuth';
import { AppShell } from './AppShell';

function renderShell(role: UserRole) {
  render(
    <ApiContext.Provider value={new FakeApiClient()}>
      <MemoryRouter>
        <FakeAuth role={role}>
          <AppShell />
        </FakeAuth>
      </MemoryRouter>
    </ApiContext.Provider>,
  );
}

describe('AppShell', () => {
  it('o admin vê Compras no menu', () => {
    renderShell('ADMIN');
    expect(screen.getByRole('link', { name: 'Compras' })).toHaveAttribute(
      'href',
      '/compras',
    );
  });

  it('o caixa não vê Compras', () => {
    renderShell('CAIXA');
    expect(screen.queryByRole('link', { name: 'Compras' })).toBeNull();
  });
});
