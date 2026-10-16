import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiContext } from '../api/api-context';
import { FakeApiClient } from '../test-support/fake-api-client';
import { FakeAuth } from '../test-support/FakeAuth';
import { CatalogPage } from './CatalogPage';

async function renderPasswordsTab(
  api = new FakeApiClient(),
  onLogout = () => {},
) {
  api.role = 'ADMIN';
  render(
    <ApiContext.Provider value={api}>
      <FakeAuth role="ADMIN" onLogout={onLogout}>
        <CatalogPage />
      </FakeAuth>
    </ApiContext.Provider>,
  );
  await userEvent.click(
    await screen.findByRole('tab', { name: 'Comanda e ajustes' }),
  );
  await userEvent.click(screen.getByRole('tab', { name: 'Senhas' }));
  await screen.findByRole('button', { name: /Trocar a senha do caixa/ });
  return api;
}

const typeIn = (label: string, text: string, index = 0) =>
  userEvent.type(screen.getAllByLabelText(label)[index], text);

describe('CatalogPage: aba Senhas (2026-10-15)', () => {
  it('troca a senha do caixa sem a atual, conferindo a repetição', async () => {
    const api = await renderPasswordsTab();
    // 2º par de campos "senha nova": o quadro do caixa vem depois do do admin.
    await typeIn('Senha nova (6 ou mais caracteres)', 'nova123', 1);
    await typeIn('Repita a senha nova', 'nova124', 1);
    await userEvent.click(
      screen.getByRole('button', { name: /Trocar a senha do caixa/ }),
    );
    expect(screen.getByText(/não batem/)).toBeInTheDocument();
    await userEvent.clear(screen.getAllByLabelText('Repita a senha nova')[1]);
    await typeIn('Repita a senha nova', 'nova123', 1);
    await userEvent.click(
      screen.getByRole('button', { name: /Trocar a senha do caixa/ }),
    );
    expect(await screen.findByText(/Senha do caixa trocada/)).toBeVisible();
    expect(api.calls).toContainEqual({
      method: 'POST',
      path: '/users/2/password',
      body: { newPassword: 'nova123' },
    });
  });

  it('a do admin pede a atual; errada avisa, certa troca e manda entrar de novo', async () => {
    let loggedOut = false;
    await renderPasswordsTab(new FakeApiClient(), () => {
      loggedOut = true;
    });
    await typeIn('Senha atual do admin', 'chute');
    await typeIn('Senha nova (6 ou mais caracteres)', 'admin456');
    await typeIn('Repita a senha nova', 'admin456');
    await userEvent.click(
      screen.getByRole('button', { name: /Trocar a senha do admin/ }),
    );
    expect(await screen.findByText(/Senha atual incorreta/)).toBeVisible();
    await userEvent.clear(screen.getByLabelText('Senha atual do admin'));
    await typeIn('Senha atual do admin', 'admin123');
    await typeIn('Senha nova (6 ou mais caracteres)', 'admin456');
    await typeIn('Repita a senha nova', 'admin456');
    await userEvent.click(
      screen.getByRole('button', { name: /Trocar a senha do admin/ }),
    );
    expect(await screen.findByText(/Senha do admin trocada/)).toBeVisible();
    await userEvent.click(
      screen.getByRole('button', { name: /Entrar de novo/ }),
    );
    expect(loggedOut).toBe(true);
  });
});
