import { normalizeDecimal } from '../common/quantity.js';

/** Uma parcela da fórmula de um lanche: célula de `itens_custos` × fator. */
export interface FormulaTerm {
  /** Endereço sem `$` e em maiúsculas (`F11`, `H44`). */
  cell: string;
  /** Fator normalizado (`'2'`, `'1.5'`); `'1'` sem multiplicação. */
  factor: string;
}

const SOURCE_SHEET = 'itens_custos';
const REF = String.raw`${SOURCE_SHEET}!\$?([A-Z]{1,3})\$?(\d{1,7})`;
const NUMBER = String.raw`(\d+(?:\.\d+)?)`;
const PLAIN = new RegExp(`^${REF}$`);
const TIMES_AFTER = new RegExp(`^${REF}\\*${NUMBER}$`);
const TIMES_BEFORE = new RegExp(`^${NUMBER}\\*${REF}$`);

function withFactor(cell: string, rawFactor: string): FormulaTerm | null {
  const factor = normalizeDecimal(rawFactor, 3);
  return factor === null ? null : { cell, factor };
}

function parseTerm(text: string): FormulaTerm | null {
  const plain = PLAIN.exec(text);
  if (plain) return { cell: plain[1] + plain[2], factor: '1' };
  const after = TIMES_AFTER.exec(text);
  if (after) return withFactor(after[1] + after[2], after[3]);
  const before = TIMES_BEFORE.exec(text);
  if (before) return withFactor(before[2] + before[3], before[1]);
  return null;
}

/**
 * Lê a fórmula de uma célula de lanche: soma de referências a `itens_custos`, cada uma
 * com fator opcional. Devolve null para qualquer outro formato (o importador vira erro).
 *
 * @example parseComponentFormula('itens_custos!F25+itens_custos!H44*2') // [{ cell: 'F25', factor: '1' }, { cell: 'H44', factor: '2' }]
 */
export function parseComponentFormula(formula: string): FormulaTerm[] | null {
  const compact = formula.replace(/^=/, '').replace(/\s+/g, '');
  if (!compact) return null;
  const terms = compact.split('+').map(parseTerm);
  if (terms.some((term) => term === null)) return null;
  return terms as FormulaTerm[];
}
