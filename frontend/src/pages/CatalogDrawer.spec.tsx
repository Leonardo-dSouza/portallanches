import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiContext } from '../api/api-context';
import { createSettingsApi } from '../api/settings-api';
import { AppSettingsProvider } from '../settings/AppSettingsProvider';
import { FakeApiClient } from '../test-support/fake-api-client';
import { CatalogPage } from './CatalogPage';

async function renderCatalogDrawer(api = new FakeApiClient()) {
  render(
    <ApiContext.Provider value={api}>
      <AppSettingsProvider settings={createSettingsApi(api)}>
        <CatalogPage />
      </AppSettingsProvider>
    </ApiContext.Provider>,
  );
  await userEvent.click(
    await screen.findByRole('tab', { name: 'Pagamentos e gastos' }),
  );
  await userEvent.click(screen.getByRole('tab', { name: 'Gaveta' }));
  await screen.findByDisplayValue('30,00');
  return api;
}

describe('CatalogPage: subseção Gaveta (troco padrão e tolerância)', () => {
  it('edita o troco padrão e a tolerância e salva com sucesso', async () => {
    const api = await renderCatalogDrawer();

    const openingInput = screen.getByLabelText('Troco inicial padrão');
    const toleranceInput = screen.getByLabelText(
      'Diferença aceita no dinheiro',
    );

    await userEvent.clear(openingInput);
    await userEvent.type(openingInput, '45,00');
    await userEvent.clear(toleranceInput);
    await userEvent.type(toleranceInput, '3,00');

    await userEvent.click(
      screen.getByRole('button', { name: 'Salvar gaveta' }),
    );

    expect(await screen.findByText('Gaveta salva.')).toBeInTheDocument();
    expect(api.calls).toContainEqual({
      method: 'PUT',
      path: '/settings',
      body: {
        drawerOpeningDefault: '45.00',
        drawerCashTolerance: '3.00',
      },
    });
  });
});
