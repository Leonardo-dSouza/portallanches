import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { parseObject } from '../common/input-parsers.js';
import {
  APP_SETTINGS_REPOSITORY,
  type AppSettingsRepository,
} from './app-settings-repository.js';
import {
  parseCashShortcuts,
  readStoredShortcuts,
  type CashShortcuts,
} from './cash-shortcuts.js';
import {
  DEFAULT_ARTISANAL_MARK,
  parseArtisanalMark,
  parseTicketAbbreviations,
  readStoredAbbreviations,
  type TicketAbbreviation,
} from './ticket-settings.js';

const LOW_STOCK_WARNING_KEY = 'low_stock_warning';
const ARTISANAL_MARK_KEY = 'ticket_artisanal_mark';
const ABBREVIATIONS_KEY = 'ticket_abbreviations';
const SHORTCUTS_KEY = 'cash_shortcuts';
const CASHIER_FIX_MINUTES_KEY = 'cashier_fix_minutes';
/** Pedido do usuário (2026-10-09): o caixa mostra o saldo da bebida com menos de 6. */
const DEFAULT_LOW_STOCK_WARNING = 6;
const MAX_LOW_STOCK_WARNING = 999;
/** Trava do caixa (2026-10-15): até 15 min do lançamento ele cancela/diminui sem a senha. */
const DEFAULT_CASHIER_FIX_MINUTES = 15;
const MAX_CASHIER_FIX_MINUTES = 120;

/** Token de quem só lê as configurações (o cardápio do caixa lê o aviso de saldo). */
export const SETTINGS_READER = Symbol('SETTINGS_READER');

export interface SettingsReader {
  read(): Promise<AppSettings>;
}

/** Opções que o dono muda pela tela. */
export interface AppSettings {
  /** O caixa mostra o saldo do item abaixo deste número; 0 = nunca. */
  lowStockWarning: number;
  /** Vai depois do nome do artesanal, na tela e na comanda (ex.: "Art"). */
  artisanalMark: string;
  /** Trocas de palavra só na comanda impressa ("Leite condensado" → "LC"). */
  ticketAbbreviations: TicketAbbreviation[];
  /** Teclas de Salvar, Trocar tipo, Adicionais e Limpar tudo na comanda. */
  cashShortcuts: CashShortcuts;
  /** Minutos depois do lançamento em que o caixa cancela/diminui sem a senha do admin. */
  cashierFixMinutes: number;
}

/** Inteiro de 0 a `max`; `zero` diz o que o 0 quer dizer, para a mensagem. */
function parseWholeUpTo(
  raw: unknown,
  field: keyof AppSettings,
  max: number,
  zero: string,
): number {
  const ok = typeof raw === 'number' && Number.isInteger(raw);
  if (ok && raw >= 0 && raw <= max) return raw;
  throw new BadRequestException(
    `Campo "${field}" inválido: recebido ${JSON.stringify(raw)}, esperado inteiro de 0 a ${max} (0 = ${zero})`,
  );
}

/** Número gravado como texto; ausente (ou estragado) vira o padrão. */
function storedWhole(stored: string | null, fallback: number): number {
  const value = Number(stored);
  return stored === null || !Number.isInteger(value) ? fallback : value;
}

/** Como cada campo do PUT vira texto na tabela; validar tudo antes de gravar qualquer um. */
const WRITERS: Record<
  keyof AppSettings,
  { key: string; serialize(raw: unknown): string }
> = {
  lowStockWarning: {
    key: LOW_STOCK_WARNING_KEY,
    serialize: (raw) =>
      String(
        parseWholeUpTo(
          raw,
          'lowStockWarning',
          MAX_LOW_STOCK_WARNING,
          'nunca mostrar',
        ),
      ),
  },
  artisanalMark: { key: ARTISANAL_MARK_KEY, serialize: parseArtisanalMark },
  ticketAbbreviations: {
    key: ABBREVIATIONS_KEY,
    serialize: (raw) => JSON.stringify(parseTicketAbbreviations(raw)),
  },
  cashShortcuts: {
    key: SHORTCUTS_KEY,
    serialize: (raw) => JSON.stringify(parseCashShortcuts(raw)),
  },
  cashierFixMinutes: {
    key: CASHIER_FIX_MINUTES_KEY,
    serialize: (raw) =>
      String(
        parseWholeUpTo(
          raw,
          'cashierFixMinutes',
          MAX_CASHIER_FIX_MINUTES,
          'sempre pedir a senha do admin',
        ),
      ),
  },
};

function storedChanges(body: unknown): [string, string][] {
  const fields = parseObject(body, 'configurações');
  const names = Object.keys(WRITERS) as (keyof AppSettings)[];
  const changes = names
    .filter((name) => fields[name] !== undefined)
    .map((name): [string, string] => [
      WRITERS[name].key,
      WRITERS[name].serialize(fields[name]),
    ]);
  if (changes.length > 0) return changes;
  throw new BadRequestException(
    `Corpo inválido: recebido ${JSON.stringify(body)}, esperado ao menos um de ${names.slice(0, -1).join(', ')} ou ${names.at(-1)}`,
  );
}

/**
 * Configurações gerais: o aviso de saldo do caixa, a comanda (marca do artesanal e
 * abreviações), os atalhos e a trava do caixa. O PUT é parcial: cada tela manda só o que é dela.
 *
 * @example (await service.read()).artisanalMark // 'Art'
 */
@Injectable()
export class AppSettingsService implements SettingsReader {
  constructor(
    @Inject(APP_SETTINGS_REPOSITORY)
    private readonly settings: AppSettingsRepository,
  ) {}

  async read(): Promise<AppSettings> {
    const [warning, mark, abbreviations, shortcuts, fixMinutes] =
      await Promise.all(
        [
          LOW_STOCK_WARNING_KEY,
          ARTISANAL_MARK_KEY,
          ABBREVIATIONS_KEY,
          SHORTCUTS_KEY,
          CASHIER_FIX_MINUTES_KEY,
        ].map((key) => this.settings.get(key)),
      );
    return {
      lowStockWarning: storedWhole(warning, DEFAULT_LOW_STOCK_WARNING),
      artisanalMark: mark ?? DEFAULT_ARTISANAL_MARK,
      ticketAbbreviations: readStoredAbbreviations(abbreviations),
      cashShortcuts: readStoredShortcuts(shortcuts),
      cashierFixMinutes: storedWhole(fixMinutes, DEFAULT_CASHIER_FIX_MINUTES),
    };
  }

  async update(body: unknown): Promise<AppSettings> {
    for (const [key, value] of storedChanges(body)) {
      await this.settings.set(key, value);
    }
    return this.read();
  }
}
