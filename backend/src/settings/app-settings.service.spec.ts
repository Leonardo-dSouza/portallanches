import { BadRequestException } from '@nestjs/common';
import type { AppSettingsRepository } from './app-settings-repository.js';
import { AppSettingsService } from './app-settings.service.js';
import { DEFAULT_CASH_SHORTCUTS } from './cash-shortcuts.js';
import {
  DEFAULT_DELIVERY_CODE_CONFIRM_MESSAGE,
  DEFAULT_DELIVERY_CODE_ROUTE_MESSAGE,
} from './delivery-code-messages.js';
import { DEFAULT_PAYMENT_KEY_LAYOUT } from './payment-key-layout.js';

/** O que não muda nos testes de cada campo. */
const UNTOUCHED = {
  cashShortcuts: DEFAULT_CASH_SHORTCUTS,
  cashierFixMinutes: 15,
  paymentKeyLayout: DEFAULT_PAYMENT_KEY_LAYOUT,
  drawerOpeningDefault: '30.00',
  drawerCashTolerance: '2.00',
  ifoodProfitPercent: '10',
  ifoodCommissionPercent: '28',
  deliveryCodeConfirmMessage: DEFAULT_DELIVERY_CODE_CONFIRM_MESSAGE,
  deliveryCodeRouteMessage: DEFAULT_DELIVERY_CODE_ROUTE_MESSAGE,
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
  it('grava e lê o lugar do A pagar e do Dividir nas teclas (2026-11-10)', async () => {
    const { service, repository } = build();
    const paymentKeyLayout = {
      openAccount: { position: 4, active: false },
      split: { position: 2, active: true },
    };
    const saved = await service.update({ paymentKeyLayout });
    expect(saved.paymentKeyLayout).toEqual(paymentKeyLayout);
    expect(JSON.parse(repository.values.get('payment_key_layout')!)).toEqual(
      paymentKeyLayout,
    );
  });

  it('recusa o lugar das teclas inválido sem gravar nada', async () => {
    const { service, repository } = build();
    await expect(
      service.update({
        cashierFixMinutes: 10,
        paymentKeyLayout: { openAccount: { position: 1, active: true } },
      }),
    ).rejects.toThrow(BadRequestException);
    expect(repository.values.size).toBe(0);
  });

  it('sem valor gravado: saldo abaixo de 6, marca "Art", nenhuma abreviação, atalhos de antes e 15 min', async () => {
    expect(await build().service.read()).toEqual({
      lowStockWarning: 6,
      artisanalMark: 'Art',
      ticketAbbreviations: [],
      ...UNTOUCHED,
    });
  });

  it('settings devolve "10"/"28" sem chave gravada e grava valores novos', async () => {
    const { service, repository } = build();
    const initial = await service.read();
    expect(initial.ifoodProfitPercent).toBe('10');
    expect(initial.ifoodCommissionPercent).toBe('28');

    const updated = await service.update({
      ifoodProfitPercent: '12.50',
      ifoodCommissionPercent: 27,
    });
    expect(updated.ifoodProfitPercent).toBe('12.5');
    expect(updated.ifoodCommissionPercent).toBe('27');
    expect(repository.values.get('ifood_profit_percent')).toBe('12.5');
    expect(repository.values.get('ifood_commission_percent')).toBe('27');
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
      /lowStockWarning.*drawerCashTolerance/,
    );
  });

  it('grava as mensagens do código de entrega (2026-11-21)', async () => {
    const { service, repository } = build();
    const saved = await service.update({
      deliveryCodeConfirmMessage: 'Código: [CÓDIGO]',
      deliveryCodeRouteMessage: 'Saiu!',
    });
    expect(saved).toMatchObject({
      deliveryCodeConfirmMessage: 'Código: [CÓDIGO]',
      deliveryCodeRouteMessage: 'Saiu!',
    });
    expect(repository.values.get('delivery_code_route_message')).toBe('Saiu!');
  });

  it('confirmação sem [CÓDIGO] não grava nenhuma das duas', async () => {
    const { service, repository } = build();
    await expect(
      service.update({
        deliveryCodeRouteMessage: 'Saiu!',
        deliveryCodeConfirmMessage: 'Confirmado',
      }),
    ).rejects.toThrow(/\[CÓDIGO\]/);
    expect(repository.values.size).toBe(0);
  });

  it('grava e lê o troco inicial padrão e a tolerância da gaveta (2026-11-12)', async () => {
    const { service, repository } = build();
    const saved = await service.update({
      drawerOpeningDefault: '40.00',
      drawerCashTolerance: '1.50',
    });
    expect(saved.drawerOpeningDefault).toBe('40.00');
    expect(saved.drawerCashTolerance).toBe('1.50');
    expect(repository.values.get('drawer_opening_default')).toBe('40.00');
    expect(repository.values.get('drawer_cash_tolerance')).toBe('1.50');
    expect(await service.read()).toMatchObject({
      drawerOpeningDefault: '40.00',
      drawerCashTolerance: '1.50',
    });
  });

  it('não grava nada se um dos campos for recusado', async () => {
    const { service, repository } = build();
    await expect(
      service.update({ artisanalMark: 'Art', ticketAbbreviations: 'LC' }),
    ).rejects.toThrow(BadRequestException);
    expect(repository.values.size).toBe(0);
  });
});
