import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiContext } from '../api/api-context';
import { createSettingsApi } from '../api/settings-api';
import { useCashShortcuts } from '../settings/app-settings-context';
import { AppSettingsProvider } from '../settings/AppSettingsProvider';
import { FakeApiClient } from '../test-support/fake-api-client';
import { CatalogPage } from './CatalogPage';

/** O atalho de salvar que as outras telas deste PC estão usando. */
function SaveKeyInUse() {
  return <p>{`salvar em uso: ${useCashShortcuts().save}`}</p>;
}

async function renderCashierTab(api = new FakeApiClient()) {
  render(
    <ApiContext.Provider value={api}>
      <AppSettingsProvider settings={createSettingsApi(api)}>
        <CatalogPage />
        <SaveKeyInUse />
      </AppSettingsProvider>
    </ApiContext.Provider>,
  );
  await userEvent.click(
    await screen.findByRole('tab', { name: 'Comanda e ajustes' }),
  );
  await userEvent.click(screen.getByRole('tab', { name: 'Caixa' }));
  await screen.findByDisplayValue('15');
  return api;
}

describe('CatalogPage: aba Caixa (atalhos e trava, 2026-10-15)', () => {
  it('troca o atalho de salvar e a trava, grava e vale na hora neste PC', async () => {
    const api = await renderCashierTab();
    await userEvent.selectOptions(screen.getByLabelText('Salvar pedido'), 'F9');
    const minutes = screen.getByLabelText(/Minutos para o caixa/);
    await userEvent.clear(minutes);
    await userEvent.type(minutes, '10');
    await userEvent.click(
      screen.getByRole('button', { name: 'Salvar atalhos e trava' }),
    );
    expect(
      await screen.findByText('Atalhos e trava salvos.'),
    ).toBeInTheDocument();
    expect(api.calls).toContainEqual({
      method: 'PUT',
      path: '/settings',
      body: {
        cashShortcuts: {
          save: 'F9',
          toggleType: 'F2',
          addons: 'F4',
          clearAll: 'F8',
        },
        cashierFixMinutes: 10,
      },
    });
    expect(screen.getByText('salvar em uso: F9')).toBeInTheDocument();
  });

  it('a mesma tecla em duas ações não salva e diz quais', async () => {
    const api = await renderCashierTab();
    await userEvent.selectOptions(screen.getByLabelText('Limpar tudo'), 'F2');
    await userEvent.click(
      screen.getByRole('button', { name: 'Salvar atalhos e trava' }),
    );
    expect(
      screen.getByText(
        /F2 está em "Trocar Balcão\/Entrega" e em "Limpar tudo"/,
      ),
    ).toBeInTheDocument();
    expect(api.calls.some((call) => call.method === 'PUT')).toBe(false);
  });
});
