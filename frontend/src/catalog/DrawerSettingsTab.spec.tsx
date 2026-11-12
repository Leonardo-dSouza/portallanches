import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { SettingsApi } from '../api/settings-api';
import type { AppSettings } from '../api/types';
import { DEFAULT_APP_SETTINGS } from '../settings/app-settings-context';
import { DrawerSettingsTab } from './DrawerSettingsTab';

class FakeDrawerSettingsApi implements SettingsApi {
  saved: Partial<AppSettings> | null = null;
  settings: AppSettings = structuredClone(DEFAULT_APP_SETTINGS);

  async readSettings(): Promise<AppSettings> {
    return this.settings;
  }

  async saveSettings(partial: Partial<AppSettings>): Promise<AppSettings> {
    this.saved = partial;
    this.settings = { ...this.settings, ...partial };
    return this.settings;
  }
}

describe('DrawerSettingsTab', () => {
  it('lê os valores gravados, edita e salva na API', async () => {
    const api = new FakeDrawerSettingsApi();
    render(<DrawerSettingsTab settings={api} />);

    expect(await screen.findByDisplayValue('30,00')).toBeInTheDocument();
    expect(screen.getByDisplayValue('2,00')).toBeInTheDocument();

    const openingInput = screen.getByLabelText('Troco inicial padrão');
    const toleranceInput = screen.getByLabelText(
      'Diferença aceita no dinheiro',
    );

    await userEvent.clear(openingInput);
    await userEvent.type(openingInput, '40,00');
    await userEvent.clear(toleranceInput);
    await userEvent.type(toleranceInput, '5,00');

    await userEvent.click(
      screen.getByRole('button', { name: 'Salvar gaveta' }),
    );

    expect(await screen.findByText('Gaveta salva.')).toBeInTheDocument();
    expect(api.saved).toEqual({
      drawerOpeningDefault: '40.00',
      drawerCashTolerance: '5.00',
    });
  });

  it('exibe erro de validação e não chama saveSettings quando valor é inválido', async () => {
    const api = new FakeDrawerSettingsApi();
    render(<DrawerSettingsTab settings={api} />);

    const openingInput = await screen.findByLabelText('Troco inicial padrão');
    await userEvent.clear(openingInput);
    await userEvent.type(openingInput, 'abc');

    await userEvent.click(
      screen.getByRole('button', { name: 'Salvar gaveta' }),
    );

    expect(
      await screen.findByText(
        'Valor inválido para o troco inicial padrão "abc": esperado número de 0 a 9.999,99',
      ),
    ).toBeInTheDocument();
    expect(api.saved).toBeNull();
  });
});
