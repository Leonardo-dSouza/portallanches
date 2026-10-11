import { BadRequestException } from '@nestjs/common';
import { parseObject, parseText } from '../common/input-parsers.js';

/** "Leite condensado" → "LC" na comanda impressa; `to` vazio apaga a palavra (ex.: o "X"). */
export interface TicketAbbreviation {
  from: string;
  to: string;
}

/** Pedido do usuário (2026-10-11): "somente Art fica melhor" que o antigo "(art.)". */
export const DEFAULT_ARTISANAL_MARK = 'Art';
const MAX_MARK_LENGTH = 12;
const MAX_FROM_LENGTH = 40;
const MAX_TO_LENGTH = 20;
const MAX_ABBREVIATIONS = 100;
const FIELD = 'ticketAbbreviations';

const invalid = (field: string, raw: unknown, expected: string): never => {
  throw new BadRequestException(
    `Campo "${field}" inválido: recebido ${JSON.stringify(raw)}, esperado ${expected}`,
  );
};

/**
 * A marca que separa o artesanal do tradicional de mesmo nome (tela e papel).
 *
 * @example parseArtisanalMark(' Art ') // 'Art'
 */
export function parseArtisanalMark(raw: unknown): string {
  return parseText(raw, 'artisanalMark', MAX_MARK_LENGTH);
}

function parseAbbreviation(raw: unknown, index: number): TicketAbbreviation {
  const fields = parseObject(raw, 'abreviação ({ from, to })');
  const from = parseText(
    fields.from,
    `${FIELD}[${index}].from`,
    MAX_FROM_LENGTH,
  );
  const to = typeof fields.to === 'string' ? fields.to.trim() : null;
  if (to === null || to.length > MAX_TO_LENGTH) {
    return invalid(
      `${FIELD}[${index}].to`,
      fields.to,
      `texto de 0 a ${MAX_TO_LENGTH} caracteres`,
    );
  }
  return { from, to };
}

function assertUniqueFrom(abbreviations: TicketAbbreviation[]): void {
  const seen = new Set<string>();
  for (const { from } of abbreviations) {
    const key = from.toLocaleLowerCase('pt-BR');
    if (seen.has(key)) {
      throw new BadRequestException(
        `Campo "${FIELD}" inválido: "${from}" aparece mais de uma vez, esperado cada texto uma vez só (sem ligar para maiúscula)`,
      );
    }
    seen.add(key);
  }
}

/**
 * Lista de abreviações da comanda, aparada e sem texto repetido.
 *
 * @example parseTicketAbbreviations([{ from: 'Leite em pó', to: 'LP' }])
 */
export function parseTicketAbbreviations(raw: unknown): TicketAbbreviation[] {
  if (!Array.isArray(raw) || raw.length > MAX_ABBREVIATIONS) {
    return invalid(
      FIELD,
      raw,
      `lista de até ${MAX_ABBREVIATIONS} { from, to }`,
    );
  }
  const abbreviations = raw.map(parseAbbreviation);
  assertUniqueFrom(abbreviations);
  return abbreviations;
}

/**
 * A lista gravada em JSON; estragada vira nenhuma, porque a comanda nunca pode deixar de sair.
 *
 * @example readStoredAbbreviations(null) // []
 */
export function readStoredAbbreviations(
  stored: string | null,
): TicketAbbreviation[] {
  if (stored === null) return [];
  try {
    return parseTicketAbbreviations(JSON.parse(stored));
  } catch {
    return [];
  }
}
