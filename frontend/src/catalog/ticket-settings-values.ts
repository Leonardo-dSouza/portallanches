import type { TicketAbbreviation } from '../api/types';
import type { TicketSettings } from '../print/ticket-settings';
import type { Parsed } from './catalog-values';

/** Mesmos limites do backend (`settings/ticket-settings.ts`). */
const MAX_MARK_LENGTH = 12;
const MAX_FROM_LENGTH = 40;
const MAX_TO_LENGTH = 20;
const MAX_ABBREVIATIONS = 100;

const isBlank = (row: TicketAbbreviation) =>
  row.from.trim() === '' && row.to.trim() === '';

function rowError(row: TicketAbbreviation, index: number): string | null {
  const from = row.from.trim();
  const to = row.to.trim();
  const label = `Abreviação ${index + 1}`;
  if (from.length === 0 || from.length > MAX_FROM_LENGTH)
    return `${label} com o texto "${row.from}" (troca por "${row.to}"): esperado texto de 1 a ${MAX_FROM_LENGTH} caracteres`;
  if (to.length > MAX_TO_LENGTH)
    return `${label} "${to}" longa demais: esperado de 0 a ${MAX_TO_LENGTH} caracteres (vazio apaga a palavra)`;
  return null;
}

function repeatedFrom(rows: TicketAbbreviation[]): string | null {
  const seen = new Set<string>();
  for (const { from } of rows) {
    const key = from.toLocaleLowerCase('pt-BR');
    if (seen.has(key))
      return `"${from}" aparece mais de uma vez: esperado cada texto uma vez só (sem ligar para maiúscula)`;
    seen.add(key);
  }
  return null;
}

function parseAbbreviations(
  rows: TicketAbbreviation[],
): Parsed<TicketAbbreviation[]> {
  const filled = rows.filter((row) => !isBlank(row));
  if (filled.length > MAX_ABBREVIATIONS)
    return {
      ok: false,
      error: `${filled.length} abreviações: esperado até ${MAX_ABBREVIATIONS}`,
    };
  const invalid = filled.map(rowError).find((error) => error !== null);
  if (invalid) return { ok: false, error: invalid };
  const trimmed = filled.map((row) => ({
    from: row.from.trim(),
    to: row.to.trim(),
  }));
  const repeated = repeatedFrom(trimmed);
  return repeated
    ? { ok: false, error: repeated }
    : { ok: true, value: trimmed };
}

/**
 * O que o dono digitou na aba Comanda, com as mesmas regras do backend. Linha toda vazia (a
 * que sobrou do "Adicionar") é ignorada.
 *
 * @example parseTicketForm('Art', [{ from: 'Leite em pó', to: 'LP' }]).ok // true
 */
export function parseTicketForm(
  mark: string,
  rows: TicketAbbreviation[],
): Parsed<TicketSettings> {
  const artisanalMark = mark.trim();
  if (artisanalMark.length === 0 || artisanalMark.length > MAX_MARK_LENGTH)
    return {
      ok: false,
      error: `Marca do artesanal inválida "${mark}": esperado texto de 1 a ${MAX_MARK_LENGTH} caracteres`,
    };
  const abbreviations = parseAbbreviations(rows);
  if (!abbreviations.ok) return abbreviations;
  return {
    ok: true,
    value: { artisanalMark, ticketAbbreviations: abbreviations.value },
  };
}
