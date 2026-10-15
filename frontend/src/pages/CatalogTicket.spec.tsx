import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiContext } from '../api/api-context';
import { createSettingsApi } from '../api/settings-api';
import type { Product } from '../api/types';
import { useTicketSettings } from '../print/ticket-settings';
import { AppSettingsProvider } from '../settings/AppSettingsProvider';
import { FakeApiClient } from '../test-support/fake-api-client';
import { CatalogPage } from './CatalogPage';

const product = (id: number, name: string, categoryName: string): Product => ({
  id,
  name,
  categoryName,
  categoryId: 1,
  menuNumber: null,
  salePrice: '3.50',
  active: true,
  description: null,
  components: [],
  bundleItems: [],
  cmv: '0.00',
  cmvComplete: true,
  cmvPercent: null,
});

/** A marca que as outras telas deste PC estão usando. */
function MarkInUse() {
  return <p>{`marca em uso: ${useTicketSettings().artisanalMark}`}</p>;
}

async function renderTicketTab(api = new FakeApiClient()) {
  render(
    <ApiContext.Provider value={api}>
      <AppSettingsProvider settings={createSettingsApi(api)}>
        <CatalogPage />
        <MarkInUse />
      </AppSettingsProvider>
    </ApiContext.Provider>,
  );
  await userEvent.click(
    await screen.findByRole('tab', { name: 'Comanda e ajustes' }),
  );
  await screen.findByDisplayValue(api.settings.artisanalMark);
  return api;
}

const typeInto = async (label: string, text: string) => {
  const input = screen.getByLabelText(label);
  await userEvent.clear(input);
  await userEvent.type(input, text);
};

describe('CatalogPage: aba Comanda', () => {
  it('mostra a marca e as abreviações salvas', async () => {
    const api = new FakeApiClient();
    api.settings.ticketAbbreviations = [{ from: 'Leite em pó', to: 'LP' }];
    await renderTicketTab(api);
    expect(screen.getByLabelText('Marca do artesanal')).toHaveValue('Art');
    expect(screen.getByLabelText('Texto 1')).toHaveValue('Leite em pó');
    expect(screen.getByLabelText('Abreviação 1')).toHaveValue('LP');
  });

  it('salva só a comanda e troca a marca deste PC na hora', async () => {
    const api = await renderTicketTab();
    await typeInto('Marca do artesanal', '(art)');
    await userEvent.click(
      screen.getByRole('button', { name: 'Adicionar abreviação' }),
    );
    await typeInto('Texto 1', 'Leite condensado');
    await typeInto('Abreviação 1', 'LC');
    await userEvent.click(
      screen.getByRole('button', { name: 'Salvar comanda' }),
    );
    expect(await screen.findByText('Comanda salva.')).toBeInTheDocument();
    const put = api.calls.find((call) => call.method === 'PUT');
    expect(put?.body).toEqual({
      artisanalMark: '(art)',
      ticketAbbreviations: [{ from: 'Leite condensado', to: 'LC' }],
    });
    expect(api.settings.lowStockWarning).toBe(6);
    expect(screen.getByText('marca em uso: (art)')).toBeInTheDocument();
  });

  it('recusa o mesmo texto duas vezes e não salva', async () => {
    const api = await renderTicketTab();
    const add = screen.getByRole('button', { name: 'Adicionar abreviação' });
    await userEvent.click(add);
    await userEvent.click(add);
    await typeInto('Texto 1', 'Leite');
    await typeInto('Texto 2', 'LEITE');
    await userEvent.click(
      screen.getByRole('button', { name: 'Salvar comanda' }),
    );
    expect(screen.getByRole('status')).toHaveTextContent(
      '"LEITE" aparece mais de uma vez',
    );
    expect(api.calls.some((call) => call.method === 'PUT')).toBe(false);
  });

  it('remove uma abreviação', async () => {
    const api = new FakeApiClient();
    api.settings.ticketAbbreviations = [
      { from: 'Leite em pó', to: 'LP' },
      { from: 'X', to: '' },
    ];
    await renderTicketTab(api);
    await userEvent.click(
      screen.getByRole('button', { name: 'Remover abreviação 1' }),
    );
    expect(screen.getByLabelText('Texto 1')).toHaveValue('X');
    expect(screen.queryByLabelText('Texto 2')).toBeNull();
  });

  it('a prévia mostra os nomes do cardápio que mudam no papel', async () => {
    const api = new FakeApiClient();
    api.products = [
      product(1, 'X Salada', 'Tradicional'),
      product(2, 'Leite condensado', 'Adicionais do açaí'),
    ];
    await renderTicketTab(api);
    const preview = screen.getByRole('region', { name: 'Como sai no papel' });
    expect(
      within(preview).getByText('Nenhum nome do cardápio muda.'),
    ).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole('button', { name: 'Adicionar abreviação' }),
    );
    await typeInto('Texto 1', 'leite condensado');
    await typeInto('Abreviação 1', 'LC');
    const rows = within(preview).getAllByRole('listitem');
    expect(rows.map((row) => row.textContent)).toEqual([
      'Leite condensado → LC',
    ]);
  });

  it('o aviso de saldo do caixa mora aqui desde 2026-10-11 (padrão 6)', async () => {
    const api = await renderTicketTab();
    const field = await screen.findByDisplayValue('6');
    await userEvent.clear(field);
    await userEvent.type(field, '10');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar aviso' }));
    expect(
      await screen.findByText('Aviso de saldo salvo.'),
    ).toBeInTheDocument();
    expect(api.calls).toContainEqual({
      method: 'PUT',
      path: '/settings',
      body: { lowStockWarning: 10 },
    });
  });
});
