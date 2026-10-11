import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { SettingsApi } from '../api/settings-api';
import type { AppSettings } from '../api/types';
import { useReplaceTicketSettings, useTicketSettings } from './ticket-settings';
import { TicketSettingsProvider } from './TicketSettingsProvider';

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
  return (
    <>
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

describe('TicketSettingsProvider', () => {
  it('lê a marca e as abreviações das configurações para as telas e a comanda', async () => {
    const api = new StoredSettingsApi({
      lowStockWarning: 6,
      artisanalMark: '(art)',
      ticketAbbreviations: [{ from: 'Leite condensado', to: 'LC' }],
    });
    render(
      <TicketSettingsProvider settings={api}>
        <ShowTicketSettings />
      </TicketSettingsProvider>,
    );
    expect(await screen.findByText('marca: (art)')).toBeInTheDocument();
    expect(screen.getByText('abreviações: 1')).toBeInTheDocument();
  });

  it('sem conseguir ler, usa o padrão: a comanda nunca para por causa disso', async () => {
    render(
      <TicketSettingsProvider settings={new OfflineSettingsApi()}>
        <ShowTicketSettings />
      </TicketSettingsProvider>,
    );
    await act(() => Promise.resolve());
    expect(screen.getByText('marca: Art')).toBeInTheDocument();
    expect(screen.getByText('abreviações: 0')).toBeInTheDocument();
  });

  it('a aba Comanda troca na hora para este PC', async () => {
    render(
      <TicketSettingsProvider settings={new OfflineSettingsApi()}>
        <ShowTicketSettings />
      </TicketSettingsProvider>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Trocar' }));
    expect(screen.getByText('marca: A')).toBeInTheDocument();
  });
});
