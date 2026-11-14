import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FakeApiClient } from '../test-support/fake-api-client';
import { createSettingsApi } from '../api/settings-api';
import { IfoodSettingsTab } from './IfoodSettingsTab';

describe('IfoodSettingsTab', () => {
  it('carrega 10/28 do GET /settings e mostra a linha de explicação', async () => {
    const api = new FakeApiClient();
    const settings = createSettingsApi(api);
    render(<IfoodSettingsTab settings={settings} />);

    expect(await screen.findByDisplayValue('10')).toBeInTheDocument();
    expect(screen.getByDisplayValue('28')).toBeInTheDocument();
    expect(
      screen.getByText(
        'O PV iFood da área Custos = CMV ÷ (1 − custo fixo da categoria − lucro no iFood) ÷ (1 − comissão). Só cálculo: nada é enviado ao iFood.',
      ),
    ).toBeInTheDocument();
  });

  it('grava valores novos pelo PUT /settings', async () => {
    const api = new FakeApiClient();
    const settings = createSettingsApi(api);
    render(<IfoodSettingsTab settings={settings} />);

    const profitInput = await screen.findByLabelText('Lucro no iFood %');
    const commissionInput = screen.getByLabelText('Comissão do iFood %');

    await userEvent.clear(profitInput);
    await userEvent.type(profitInput, '12,5');
    await userEvent.clear(commissionInput);
    await userEvent.type(commissionInput, '27');

    await userEvent.click(
      screen.getByRole('button', { name: /Salvar iFood/i }),
    );

    await waitFor(() =>
      expect(
        api.calls.find((c) => c.method === 'PUT' && c.path === '/settings')
          ?.body,
      ).toEqual({
        ifoodProfitPercent: '12.5',
        ifoodCommissionPercent: '27',
      }),
    );
    expect(await screen.findByText('iFood salvo.')).toBeInTheDocument();
  });
});
