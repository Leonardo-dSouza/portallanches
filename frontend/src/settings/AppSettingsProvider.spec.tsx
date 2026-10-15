import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { SettingsApi } from '../api/settings-api';
import type { AppSettings } from '../api/types';
import {
  useReplaceTicketSettings,
  useTicketSettings,
} from '../print/ticket-settings';
import { DEFAULT_APP_SETTINGS, useCashShortcuts } from './app-settings-context';
import { AppSettingsProvider } from './AppSettingsProvider';

/** Configurações guardadas em memória, como o `GET /settings`. */
class StoredSettingsApi implements SettingsApi {
  private readonly stored: AppSettings;

  constructor(stored: AppSettings) {
    this.stored = stored;
  }

  async readSettings(): Promise<AppSettings> {
    return this.stored;
  }

  async saveSettings(): Promise<AppSettings> {
    return this.stored;
  }
}

/** Servidor fora do ar: a leitura falha. */
class OfflineSettingsApi implements SettingsApi {
  async readSettings(): Promise<AppSettings> {
    throw new Error('Falha de rede');
  }

  async saveSettings(): Promise<AppSettings> {
    throw new Error('Falha de rede');
  }
}

function ShowTicketSettings() {
  const { artisanalMark, ticketAbbreviations } = useTicketSettings();
  const replace = useReplaceTicketSettings();
  const shortcuts = useCashShortcuts();
  return (
    <>
      <p>{`salvar: ${shortcuts.save}`}</p>
      <p>{`marca: ${artisanalMark}`}</p>
      <p>{`abreviações: ${ticketAbbreviations.length}`}</p>
      <button
        type="button"
        onClick={() => replace({ artisanalMark: 'A', ticketAbbreviations: [] })}
      >
        Trocar
      </button>
    </>
  );
}

describe('AppSettingsProvider', () => {
  it('lê a comanda e os atalhos das configurações para as telas', async () => {
    const api = new StoredSettingsApi({
      ...DEFAULT_APP_SETTINGS,
      artisanalMark: '(art)',
      ticketAbbreviations: [{ from: 'Leite condensado', to: 'LC' }],
      cashShortcuts: { ...DEFAULT_APP_SETTINGS.cashShortcuts, save: 'F9' },
    });
    render(
      <AppSettingsProvider settings={api}>
        <ShowTicketSettings />
      </AppSettingsProvider>,
    );
    expect(await screen.findByText('marca: (art)')).toBeInTheDocument();
    expect(screen.getByText('abreviações: 1')).toBeInTheDocument();
    expect(screen.getByText('salvar: F9')).toBeInTheDocument();
  });

  it('sem conseguir ler, usa o padrão: a comanda nunca para por causa disso', async () => {
    render(
      <AppSettingsProvider settings={new OfflineSettingsApi()}>
        <ShowTicketSettings />
      </AppSettingsProvider>,
    );
    await act(() => Promise.resolve());
    expect(screen.getByText('marca: Art')).toBeInTheDocument();
    expect(screen.getByText('abreviações: 0')).toBeInTheDocument();
    expect(screen.getByText('salvar: Ctrl+Enter')).toBeInTheDocument();
  });

  it('a aba Comanda troca na hora para este PC', async () => {
    render(
      <AppSettingsProvider settings={new OfflineSettingsApi()}>
        <ShowTicketSettings />
      </AppSettingsProvider>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Trocar' }));
    expect(screen.getByText('marca: A')).toBeInTheDocument();
  });
});
