import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ApiContext } from '../api/api-context';
import { FakeApiClient } from '../test-support/fake-api-client';
import { AuthProvider } from '../auth/AuthProvider';
import type { TokenStorage } from '../auth/token-storage';
import { App } from '../App';

class FakeTokenStorage implements TokenStorage {
  token: string | null;

  constructor(token: string | null = null) {
    this.token = token;
  }
  read = (): string | null => this.token;
  write = (token: string): void => {
    this.token = token;
  };
  clear = (): void => {
    this.token = null;
  };
}

function renderApp(api: FakeApiClient, storage: TokenStorage, path = '/') {
  render(
    <MemoryRouter initialEntries={[path]}>
      <ApiContext.Provider value={api}>
        <AuthProvider api={api} storage={storage}>
          <App />
        </AuthProvider>
      </ApiContext.Provider>
    </MemoryRouter>,
  );
}

describe('login', () => {
  it('sem sessão, redireciona a rota protegida para o login', () => {
    renderApp(new FakeApiClient(), new FakeTokenStorage());
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeInTheDocument();
  });

  it('entra com credenciais válidas, guarda o token e mostra o usuário', async () => {
    const storage = new FakeTokenStorage();
    renderApp(new FakeApiClient(), storage);
    await userEvent.type(screen.getByLabelText('Usuário'), 'maria');
    await userEvent.type(screen.getByLabelText('Senha'), 'segredo1');
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(await screen.findByText('Maria · Caixa')).toBeInTheDocument();
    expect(storage.token).toBe('t1');
  });

  it('mostra a mensagem do backend quando o login falha', async () => {
    const api = new FakeApiClient();
    api.loginFails = true;
    renderApp(api, new FakeTokenStorage());
    await userEvent.type(screen.getByLabelText('Usuário'), 'maria');
    await userEvent.type(screen.getByLabelText('Senha'), 'errada');
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Credenciais inválidas',
    );
  });

  it('sair descarta o token e volta ao login', async () => {
    const api = new FakeApiClient();
    const storage = new FakeTokenStorage();
    renderApp(api, storage);
    await userEvent.type(screen.getByLabelText('Usuário'), 'maria');
    await userEvent.type(screen.getByLabelText('Senha'), 'segredo1');
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Sair' }));
    expect(
      await screen.findByRole('button', { name: 'Entrar' }),
    ).toBeInTheDocument();
    expect(storage.token).toBeNull();
    expect(api.lines).toContain('POST /auth/logout');
  });
});
