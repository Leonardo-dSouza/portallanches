import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiContext } from '../api/api-context';
import { FakeApiClient } from '../test-support/fake-api-client';
import { CatalogPage } from './CatalogPage';

async function openIfoodSection(api = new FakeApiClient()) {
  render(
    <ApiContext.Provider value={api}>
      <CatalogPage />
    </ApiContext.Provider>,
  );
  // O Cardápio é a aba padrão; abre a subseção iFood perto de Categorias
  await userEvent.click(await screen.findByRole('tab', { name: 'iFood' }));
  await screen.findByRole('button', { name: 'Salvar iFood' });
  return api;
}

describe('CatalogPage: iFood', () => {
  it('carrega 10 e 28 do GET /settings e grava valores novos', async () => {
    const api = await openIfoodSection();

    expect(await screen.findByDisplayValue('10')).toBeInTheDocument();
    expect(screen.getByDisplayValue('28')).toBeInTheDocument();
    expect(
      screen.getByText(
        'O PV iFood da área Custos = CMV ÷ (1 − custo fixo da categoria − lucro no iFood) ÷ (1 − comissão). Só cálculo: nada é enviado ao iFood.',
      ),
    ).toBeInTheDocument();

    const profitInput = screen.getByLabelText('Lucro no iFood %');
    const commissionInput = screen.getByLabelText('Comissão do iFood %');

    await userEvent.clear(profitInput);
    await userEvent.type(profitInput, '15');
    await userEvent.clear(commissionInput);
    await userEvent.type(commissionInput, '26,5');

    await userEvent.click(screen.getByRole('button', { name: 'Salvar iFood' }));

    await waitFor(() =>
      expect(
        api.calls.find((c) => c.method === 'PUT' && c.path === '/settings')
          ?.body,
      ).toEqual({
        ifoodProfitPercent: '15',
        ifoodCommissionPercent: '26.5',
      }),
    );
    expect(await screen.findByText('iFood salvo.')).toBeInTheDocument();
  });
});
