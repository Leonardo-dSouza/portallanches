import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ApiError, type ApiClient, type HttpMethod } from '../api/api-client';
import { AuthProvider } from '../auth/AuthProvider';
import type { TokenStorage } from '../auth/token-storage';
import { App } from '../App';

class FakeApiClient implements ApiClient {
  readonly calls: string[] = [];

  private readonly loginFails: boolean;

  constructor(loginFails = false) {
    this.loginFails = loginFails;
  }

  async request<T>(method: HttpMethod, path: string): Promise<T> {
    this.calls.push(`${method} ${path}`);
    if (path === '/auth/login' && this.loginFails)
      throw new ApiError(401, 'Credenciais inválidas');
    if (path === '/auth/login')
      return {
        token: 't1',
        user: { id: 2, name: 'Maria', role: 'CAIXA' },
      } as T;
    return undefined as T;
  }
}

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

function renderApp(api: ApiClient, storage: TokenStorage, path = '/') {
  render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider api={api} storage={storage}>
        <App />
      </AuthProvider>
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
    expect(await screen.findByText('Olá, Maria')).toBeInTheDocument();
    expect(storage.token).toBe('t1');
  });

  it('mostra a mensagem do backend quando o login falha', async () => {
    renderApp(new FakeApiClient(true), new FakeTokenStorage());
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
    expect(api.calls).toContain('POST /auth/logout');
  });
});
