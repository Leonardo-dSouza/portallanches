import { render, screen, within } from '@testing-library/react';
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

const managerCard = () =>
  screen
    .getByRole('heading', { name: 'Código do gerente' })
    .closest('form') as HTMLElement;

describe('CatalogPage: aba Senhas (2026-10-15)', () => {
  it('troca a senha do caixa sem a atual, conferindo a repetição', async () => {
    const api = await renderPasswordsTab();
    // O quadro do caixa vem depois do do admin (2º "Repita"); o mínimo dele é 8.
    await typeIn('Senha nova (8 ou mais caracteres)', 'cebola-77');
    await typeIn('Repita a senha nova', 'cebola-78', 1);
    await userEvent.click(
      screen.getByRole('button', { name: /Trocar a senha do caixa/ }),
    );
    expect(screen.getByText(/não batem/)).toBeInTheDocument();
    await userEvent.clear(screen.getAllByLabelText('Repita a senha nova')[1]);
    await typeIn('Repita a senha nova', 'cebola-77', 1);
    await userEvent.click(
      screen.getByRole('button', { name: /Trocar a senha do caixa/ }),
    );
    expect(await screen.findByText(/Senha do caixa trocada/)).toBeVisible();
    expect(api.calls).toContainEqual({
      method: 'POST',
      path: '/users/2/password',
      body: { newPassword: 'cebola-77' },
    });
  });

  it('a do admin pede a atual; errada avisa, certa troca e manda entrar de novo', async () => {
    let loggedOut = false;
    await renderPasswordsTab(new FakeApiClient(), () => {
      loggedOut = true;
    });
    await typeIn('Senha atual do admin', 'chute');
    await typeIn('Senha nova (10 ou mais caracteres)', 'cebola-roxa-77');
    await typeIn('Repita a senha nova', 'cebola-roxa-77');
    await userEvent.click(
      screen.getByRole('button', { name: /Trocar a senha do admin/ }),
    );
    expect(await screen.findByText(/Senha atual incorreta/)).toBeVisible();
    await userEvent.clear(screen.getByLabelText('Senha atual do admin'));
    await typeIn('Senha atual do admin', 'admin123');
    await typeIn('Senha nova (10 ou mais caracteres)', 'cebola-roxa-77');
    await typeIn('Repita a senha nova', 'cebola-roxa-77');
    await userEvent.click(
      screen.getByRole('button', { name: /Trocar a senha do admin/ }),
    );
    expect(await screen.findByText(/Senha do admin trocada/)).toBeVisible();
    await userEvent.click(
      screen.getByRole('button', { name: /Entrar de novo/ }),
    );
    expect(loggedOut).toBe(true);
  });

  it('código do gerente: situação avisa quando não cadastrado e atualiza para Cadastrado ao salvar certo', async () => {
    const api = await renderPasswordsTab();
    const card = managerCard();
    expect(
      await within(card).findByText(
        'Ainda não cadastrado: a trava do caixa não libera nada até você cadastrar.',
      ),
    ).toBeVisible();

    await userEvent.type(
      within(card).getByLabelText('Senha de login do admin'),
      'admin123',
    );
    await userEvent.type(
      within(card).getByLabelText('Código novo (6 números)'),
      '135790',
    );
    await userEvent.type(
      within(card).getByLabelText('Repita o código'),
      '135790',
    );
    await userEvent.click(
      within(card).getByRole('button', { name: 'Salvar o código' }),
    );

    expect(
      await within(card).findByText('Código do gerente salvo.'),
    ).toBeVisible();
    expect(within(card).getByText('Cadastrado.')).toBeVisible();
    expect(within(card).getByLabelText('Senha de login do admin')).toHaveValue(
      '',
    );
    expect(within(card).getByLabelText('Código novo (6 números)')).toHaveValue(
      '',
    );
    expect(within(card).getByLabelText('Repita o código')).toHaveValue('');
    expect(api.calls).toContainEqual({
      method: 'PUT',
      path: '/users/me/manager-pin',
      body: { currentPassword: 'admin123', pin: '135790' },
    });
  });

  it('código do gerente: já cadastrado mostra Cadastrado ao abrir', async () => {
    const api = new FakeApiClient();
    api.managerPin = '135790';
    await renderPasswordsTab(api);
    const card = managerCard();
    expect(await within(card).findByText('Cadastrado.')).toBeVisible();
  });

  it('código do gerente: senha atual errada mostra a mensagem da API', async () => {
    await renderPasswordsTab();
    const card = managerCard();
    await userEvent.type(
      within(card).getByLabelText('Senha de login do admin'),
      'errada',
    );
    await userEvent.type(
      within(card).getByLabelText('Código novo (6 números)'),
      '135790',
    );
    await userEvent.type(
      within(card).getByLabelText('Repita o código'),
      '135790',
    );
    await userEvent.click(
      within(card).getByRole('button', { name: 'Salvar o código' }),
    );

    expect(
      await within(card).findByText(/Senha atual incorreta/),
    ).toBeVisible();
  });

  it('código do gerente: códigos diferentes avisa no front sem chamar API', async () => {
    const api = await renderPasswordsTab();
    const card = managerCard();
    await userEvent.type(
      within(card).getByLabelText('Senha de login do admin'),
      'admin123',
    );
    await userEvent.type(
      within(card).getByLabelText('Código novo (6 números)'),
      '135790',
    );
    await userEvent.type(
      within(card).getByLabelText('Repita o código'),
      '135791',
    );
    await userEvent.click(
      within(card).getByRole('button', { name: 'Salvar o código' }),
    );

    expect(
      within(card).getByText(
        'Os dois códigos não batem: digite o mesmo nos dois campos',
      ),
    ).toBeVisible();
    expect(
      api.calls.find(
        (call) =>
          call.method === 'PUT' && call.path === '/users/me/manager-pin',
      ),
    ).toBeUndefined();
  });

  it('código do gerente: menos de 6 números avisa no front sem chamar API', async () => {
    const api = await renderPasswordsTab();
    const card = managerCard();
    await userEvent.type(
      within(card).getByLabelText('Senha de login do admin'),
      'admin123',
    );
    await userEvent.type(
      within(card).getByLabelText('Código novo (6 números)'),
      '12345',
    );
    await userEvent.type(
      within(card).getByLabelText('Repita o código'),
      '12345',
    );
    await userEvent.click(
      within(card).getByRole('button', { name: 'Salvar o código' }),
    );

    expect(
      within(card).getByText('Código novo precisa ter 6 números'),
    ).toBeVisible();
    expect(
      api.calls.find(
        (call) =>
          call.method === 'PUT' && call.path === '/users/me/manager-pin',
      ),
    ).toBeUndefined();
  });
});
