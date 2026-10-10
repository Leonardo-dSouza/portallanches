import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { parseObject } from '../common/input-parsers.js';
import {
  APP_SETTINGS_REPOSITORY,
  type AppSettingsRepository,
} from './app-settings-repository.js';

const LOW_STOCK_WARNING_KEY = 'low_stock_warning';
/** Pedido do usuário (2026-10-09): o caixa mostra o saldo da bebida com menos de 6. */
const DEFAULT_LOW_STOCK_WARNING = 6;
const MAX_LOW_STOCK_WARNING = 999;

/** Token de quem só lê as configurações (o cardápio do caixa lê o aviso de saldo). */
export const SETTINGS_READER = Symbol('SETTINGS_READER');

export interface SettingsReader {
  read(): Promise<AppSettings>;
}

/** Opções que o dono muda pela tela. */
export interface AppSettings {
  /** O caixa mostra o saldo do item abaixo deste número; 0 = nunca. */
  lowStockWarning: number;
}

function parseLowStockWarning(raw: unknown): number {
  const ok = typeof raw === 'number' && Number.isInteger(raw);
  if (ok && raw >= 0 && raw <= MAX_LOW_STOCK_WARNING) return raw;
  throw new BadRequestException(
    `Campo "lowStockWarning" inválido: recebido ${JSON.stringify(raw)}, esperado inteiro de 0 a ${MAX_LOW_STOCK_WARNING} (0 = nunca mostrar)`,
  );
}

/**
 * Configurações gerais. Hoje só o aviso de saldo do caixa.
 *
 * @example (await service.read()).lowStockWarning // 6
 */
@Injectable()
export class AppSettingsService implements SettingsReader {
  constructor(
    @Inject(APP_SETTINGS_REPOSITORY)
    private readonly settings: AppSettingsRepository,
  ) {}

  async read(): Promise<AppSettings> {
    const stored = await this.settings.get(LOW_STOCK_WARNING_KEY);
    const lowStockWarning =
      stored === null ? DEFAULT_LOW_STOCK_WARNING : Number(stored);
    return { lowStockWarning };
  }

  async update(body: unknown): Promise<AppSettings> {
    const fields = parseObject(body, 'configurações');
    const lowStockWarning = parseLowStockWarning(fields.lowStockWarning);
    await this.settings.set(LOW_STOCK_WARNING_KEY, String(lowStockWarning));
    return { lowStockWarning };
  }
}
