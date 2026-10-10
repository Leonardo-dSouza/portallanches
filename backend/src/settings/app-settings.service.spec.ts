import { BadRequestException } from '@nestjs/common';
import type { AppSettingsRepository } from './app-settings-repository.js';
import { AppSettingsService } from './app-settings.service.js';

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
  it('sem valor gravado o caixa mostra o saldo abaixo de 6', async () => {
    expect(await build().service.read()).toEqual({ lowStockWarning: 6 });
  });

  it('grava e lê o número do aviso de saldo', async () => {
    const { service, repository } = build();
    expect(await service.update({ lowStockWarning: 12 })).toEqual({
      lowStockWarning: 12,
    });
    expect(repository.values.get('low_stock_warning')).toBe('12');
  });

  it('0 desliga o aviso; negativo, fração ou texto são recusados citando o valor', async () => {
    const { service } = build();
    expect(await service.update({ lowStockWarning: 0 })).toEqual({
      lowStockWarning: 0,
    });
    await expect(service.update({ lowStockWarning: -1 })).rejects.toThrow(
      BadRequestException,
    );
    await expect(service.update({ lowStockWarning: 'seis' })).rejects.toThrow(
      /"seis"/,
    );
  });
});
