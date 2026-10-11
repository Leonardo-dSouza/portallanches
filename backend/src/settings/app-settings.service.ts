import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { parseObject } from '../common/input-parsers.js';
import {
  APP_SETTINGS_REPOSITORY,
  type AppSettingsRepository,
} from './app-settings-repository.js';
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
  /** Vai depois do nome do artesanal, na tela e na comanda (ex.: "Art"). */
  artisanalMark: string;
  /** Trocas de palavra só na comanda impressa ("Leite condensado" → "LC"). */
  ticketAbbreviations: TicketAbbreviation[];
}

function parseLowStockWarning(raw: unknown): number {
  const ok = typeof raw === 'number' && Number.isInteger(raw);
  if (ok && raw >= 0 && raw <= MAX_LOW_STOCK_WARNING) return raw;
  throw new BadRequestException(
    `Campo "lowStockWarning" inválido: recebido ${JSON.stringify(raw)}, esperado inteiro de 0 a ${MAX_LOW_STOCK_WARNING} (0 = nunca mostrar)`,
  );
}

/** Como cada campo do PUT vira texto na tabela; validar tudo antes de gravar qualquer um. */
const WRITERS: Record<
  keyof AppSettings,
  { key: string; serialize(raw: unknown): string }
> = {
  lowStockWarning: {
    key: LOW_STOCK_WARNING_KEY,
    serialize: (raw) => String(parseLowStockWarning(raw)),
  },
  artisanalMark: { key: ARTISANAL_MARK_KEY, serialize: parseArtisanalMark },
  ticketAbbreviations: {
    key: ABBREVIATIONS_KEY,
    serialize: (raw) => JSON.stringify(parseTicketAbbreviations(raw)),
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
 * Configurações gerais: o aviso de saldo do caixa e a comanda (marca do artesanal e
 * abreviações). O PUT é parcial: cada tela manda só o que é dela.
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
    const [warning, mark, abbreviations] = await Promise.all([
      this.settings.get(LOW_STOCK_WARNING_KEY),
      this.settings.get(ARTISANAL_MARK_KEY),
      this.settings.get(ABBREVIATIONS_KEY),
    ]);
    return {
      lowStockWarning:
        warning === null ? DEFAULT_LOW_STOCK_WARNING : Number(warning),
      artisanalMark: mark ?? DEFAULT_ARTISANAL_MARK,
      ticketAbbreviations: readStoredAbbreviations(abbreviations),
    };
  }

  async update(body: unknown): Promise<AppSettings> {
    for (const [key, value] of storedChanges(body)) {
      await this.settings.set(key, value);
    }
    return this.read();
  }
}
