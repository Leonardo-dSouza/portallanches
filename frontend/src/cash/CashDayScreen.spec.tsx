import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiContext } from '../api/api-context';
import { createSettingsApi } from '../api/settings-api';
import { AppSettingsProvider } from '../settings/AppSettingsProvider';
import { FakeApiClient } from '../test-support/fake-api-client';
import { FakeAuth } from '../test-support/FakeAuth';
import { CashDayScreen } from './CashDayScreen';

function renderScreen(api: FakeApiClient, date: string | null = null) {
  render(
    <ApiContext.Provider value={api}>
      <AppSettingsProvider settings={createSettingsApi(api)}>
        <FakeAuth role={api.role}>
          <CashDayScreen
            date={date}
            today="2026-09-22"
            onPickDate={() => undefined}
          />
        </FakeAuth>
      </AppSettingsProvider>
    </ApiContext.Provider>,
  );
}

// O diálogo aparece sozinho só depois das 6h (hotfix 2026-11-13): os testes fixam a hora.
const AT_NIGHT = new Date(2026, 8, 22, 19, 0);
const AFTER_MIDNIGHT = new Date(2026, 8, 22, 0, 36);

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(AT_NIGHT);
});

afterEach(() => {
  vi.useRealTimers();
});

function openingDialog() {
  return screen.queryByRole('heading', { name: 'Abrir o caixa' });
}

function waitForHeader(text = 'Caixa de 22/09/2026 - Terça') {
  return screen.findByRole('heading', { name: text });
}

describe('CashDayScreen: diálogo de abertura do caixa', () => {
  it('mostra o diálogo com o padrão de readSettings quando date === null, OPEN e openingCash nulo', async () => {
    const api = new FakeApiClient();
    api.openingCash = null;
    api.closingStatus = 'OPEN';
    api.settings.drawerOpeningDefault = '40.00';

    renderScreen(api, null);

    expect(
      await screen.findByRole('heading', { name: 'Abrir o caixa' }),
    ).toBeInTheDocument();
    expect(await screen.findByDisplayValue('40,00')).toBe(
      screen.getByLabelText('Troco inicial'),
    );
  });

  it('ao salvar, chama a API de abertura, recarrega e o diálogo some', async () => {
    const api = new FakeApiClient();
    api.openingCash = null;
    api.closingStatus = 'OPEN';
    renderScreen(api, null);

    await screen.findByRole('heading', { name: 'Abrir o caixa' });
    await userEvent.click(
      screen.getByRole('button', { name: 'Abrir o caixa' }),
    );

    expect(api.calls).toContainEqual({
      method: 'PUT',
      path: '/closings/today/opening',
      body: { amount: '30.00' },
    });
    expect(
      screen.queryByRole('heading', { name: 'Abrir o caixa' }),
    ).not.toBeInTheDocument();
  });

  it('não mostra o diálogo quando openingCash já está gravado', async () => {
    const api = new FakeApiClient();
    api.openingCash = '30.00';
    api.closingStatus = 'OPEN';
    renderScreen(api, null);

    await screen.findByRole('heading', {
      name: 'Caixa de 22/09/2026 - Terça',
    });
    expect(
      screen.queryByRole('heading', { name: 'Abrir o caixa' }),
    ).not.toBeInTheDocument();
  });

  it('não mostra o diálogo quando uma data foi escolhida (admin em outro dia)', async () => {
    const api = new FakeApiClient();
    api.openingCash = null;
    api.closingStatus = 'OPEN';
    renderScreen(api, '2026-09-20');

    await screen.findByRole('heading', {
      name: 'Caixa de 20/09/2026 - Domingo',
    });
    expect(
      screen.queryByRole('heading', { name: 'Abrir o caixa' }),
    ).not.toBeInTheDocument();
  });

  it('não mostra o diálogo quando a noite está fechada', async () => {
    const api = new FakeApiClient();
    api.openingCash = null;
    api.closingStatus = 'CLOSED';
    renderScreen(api, null);

    await screen.findByRole('heading', {
      name: 'Caixa de 22/09/2026 - Terça',
    });
    expect(
      screen.queryByRole('heading', { name: 'Abrir o caixa' }),
    ).not.toBeInTheDocument();
  });

  it('"Agora não" fecha o diálogo e deixa a tecla "Abrir o caixa" no topo, que o traz de volta', async () => {
    const api = new FakeApiClient();
    api.openingCash = null;
    renderScreen(api, null);

    await screen.findByRole('heading', { name: 'Abrir o caixa' });
    await userEvent.click(screen.getByRole('button', { name: 'Agora não' }));

    expect(openingDialog()).not.toBeInTheDocument();
    expect(api.calls.map((call) => call.method)).not.toContain('PUT');
    await userEvent.click(
      screen.getByRole('button', { name: 'Abrir o caixa' }),
    );
    expect(openingDialog()).toBeInTheDocument();
  });

  it('o admin entra sem o diálogo e vê só a tecla do topo (regressão 2026-11-13: consulta de dia)', async () => {
    const api = new FakeApiClient();
    api.role = 'ADMIN';
    api.openingCash = null;
    renderScreen(api, null);

    await waitForHeader();
    expect(openingDialog()).not.toBeInTheDocument();
    const header = screen.getByRole('heading', {
      name: 'Caixa de 22/09/2026 - Terça',
    }).parentElement as HTMLElement;
    expect(
      within(header).getByRole('button', { name: 'Abrir o caixa' }),
    ).toBeInTheDocument();
  });

  it('de madrugada o caixa entra sem o diálogo do dia novo (fechou depois da meia-noite)', async () => {
    vi.setSystemTime(AFTER_MIDNIGHT);
    const api = new FakeApiClient();
    api.openingCash = null;
    renderScreen(api, null);

    await waitForHeader();
    expect(openingDialog()).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Abrir o caixa' }),
    ).toBeInTheDocument();
  });

  it('não mostra a tecla do topo quando o troco já está gravado', async () => {
    const api = new FakeApiClient();
    api.openingCash = '30.00';
    renderScreen(api, null);

    await waitForHeader();
    expect(
      screen.queryByRole('button', { name: 'Abrir o caixa' }),
    ).not.toBeInTheDocument();
  });
});
