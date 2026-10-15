import { BadRequestException } from '@nestjs/common';
import type { AppSettingsRepository } from './app-settings-repository.js';
import { AppSettingsService } from './app-settings.service.js';
import { DEFAULT_CASH_SHORTCUTS } from './cash-shortcuts.js';

/** O que não muda nos testes de cada campo. */
const UNTOUCHED = {
  cashShortcuts: DEFAULT_CASH_SHORTCUTS,
  cashierFixMinutes: 15,
};

/** Chave → valor em memória, como a tabela app_settings. */
class FakeAppSettingsRepository implements AppSettingsRepository {
  readonly values = new Map<string, string>();

  async get(key: string): Promise<string | null> {
    return this.values.get(key) ?? null;
  }

  async set(key: string, value: string): Promise<void> {
    this.values.set(key, value);
  }
}

function build() {
  const repository = new FakeAppSettingsRepository();
  return { service: new AppSettingsService(repository), repository };
}

describe('AppSettingsService', () => {
  it('sem valor gravado: saldo abaixo de 6, marca "Art", nenhuma abreviação, atalhos de antes e 15 min', async () => {
    expect(await build().service.read()).toEqual({
      lowStockWarning: 6,
      artisanalMark: 'Art',
      ticketAbbreviations: [],
      ...UNTOUCHED,
    });
  });

  it('grava e lê os atalhos do caixa e a trava em minutos', async () => {
    const { service, repository } = build();
    const cashShortcuts = { ...DEFAULT_CASH_SHORTCUTS, save: 'F9' };
    const saved = await service.update({ cashShortcuts, cashierFixMinutes: 0 });
    expect(saved).toMatchObject({ cashShortcuts, cashierFixMinutes: 0 });
    expect(repository.values.get('cashier_fix_minutes')).toBe('0');
    expect(await service.read()).toEqual(saved);
  });

  it('recusa trava acima de 120 min ou fracionada, citando o valor', async () => {
    const { service } = build();
    await expect(service.update({ cashierFixMinutes: 121 })).rejects.toThrow(
      /cashierFixMinutes.*121/,
    );
    await expect(service.update({ cashierFixMinutes: 1.5 })).rejects.toThrow(
      BadRequestException,
    );
  });

  it('grava e lê o número do aviso de saldo', async () => {
    const { service, repository } = build();
    expect(await service.update({ lowStockWarning: 12 })).toMatchObject({
      lowStockWarning: 12,
    });
    expect(repository.values.get('low_stock_warning')).toBe('12');
  });

  it('0 desliga o aviso; negativo, fração ou texto são recusados citando o valor', async () => {
    const { service } = build();
    expect(await service.update({ lowStockWarning: 0 })).toMatchObject({
      lowStockWarning: 0,
    });
    await expect(service.update({ lowStockWarning: -1 })).rejects.toThrow(
      BadRequestException,
    );
    await expect(service.update({ lowStockWarning: 'seis' })).rejects.toThrow(
      /"seis"/,
    );
  });

  it('grava a marca e as abreviações da comanda e devolve tudo', async () => {
    const { service, repository } = build();
    const saved = await service.update({
      artisanalMark: ' (art) ',
      ticketAbbreviations: [{ from: 'Leite condensado', to: 'LC' }],
    });
    expect(saved).toEqual({
      lowStockWarning: 6,
      artisanalMark: '(art)',
      ticketAbbreviations: [{ from: 'Leite condensado', to: 'LC' }],
      ...UNTOUCHED,
    });
    expect(repository.values.get('ticket_artisanal_mark')).toBe('(art)');
    expect(await service.read()).toEqual(saved);
  });

  it('o PUT é parcial: mudar o aviso de saldo não mexe na comanda', async () => {
    const { service } = build();
    await service.update({ artisanalMark: 'A' });
    expect(await service.update({ lowStockWarning: 3 })).toEqual({
      lowStockWarning: 3,
      artisanalMark: 'A',
      ticketAbbreviations: [],
      ...UNTOUCHED,
    });
  });

  it('recusa corpo sem nenhum campo conhecido, citando os esperados', async () => {
    await expect(build().service.update({ outro: 1 })).rejects.toThrow(
      /lowStockWarning, artisanalMark, ticketAbbreviations, cashShortcuts ou cashierFixMinutes/,
    );
  });

  it('não grava nada se um dos campos for recusado', async () => {
    const { service, repository } = build();
    await expect(
      service.update({ artisanalMark: 'Art', ticketAbbreviations: 'LC' }),
    ).rejects.toThrow(BadRequestException);
    expect(repository.values.size).toBe(0);
  });
});
