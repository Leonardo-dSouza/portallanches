import { toNeighborhoodKey } from '../cash/neighborhood-key';
import { matchesSearch } from './price-change';

/** Insumo na lista do "Ligar a insumo", marcado quando o nome bate com o item da nota. */
export interface SupplyCandidate<S extends { name: string }> {
  supply: S;
  suggested: boolean;
}

/** Palavras curtas ("de", "kg", "cx") batem com tudo e sugeririam insumo errado. */
const MIN_WORD_LENGTH = 3;

function wordsOf(text: string): string[] {
  return toNeighborhoodKey(text)
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length >= MIN_WORD_LENGTH);
}

/**
 * Palavra igual vale 2; a abreviação da nota ("REFRIG" → "Refrigerante") vale 1. O contrário
 * não conta: "Sal" não é sugerido para "TOMATE SALADA" (visto no dev, 2026-11-14).
 */
function wordScore(supplyWord: string, itemWords: string[]): number {
  if (itemWords.includes(supplyWord)) return 2;
  return itemWords.some((item) => supplyWord.startsWith(item)) ? 1 : 0;
}

/**
 * Todas as palavras do nome aparecem no item da nota (igual ou abreviada), sem acento.
 *
 * @example allWordsMatch('BACON SEARA PEDACO kg', 'Bacon Seara kg') // true
 */
export function allWordsMatch(description: string, name: string): boolean {
  const itemWords = wordsOf(description);
  return wordsOf(name).every((word) => wordScore(word, itemWords) > 0);
}

/**
 * Quanto o nome do insumo bate com o item da nota, sem acento.
 *
 * @example suggestionScore('HAMBURGUER BOV 56G CX36', 'Hambúrguer 56g') // 4
 */
export function suggestionScore(
  description: string,
  supplyName: string,
): number {
  const itemWords = wordsOf(description);
  return wordsOf(supplyName).reduce(
    (sum, word) => sum + wordScore(word, itemWords),
    0,
  );
}

/**
 * Insumos do "Ligar a insumo" (2026-11-14: busca e lista viraram uma lista só): os que batem
 * com a busca, sem acento; os que mais batem com o nome do item vêm primeiro, marcados como
 * sugeridos, e o resto em ordem alfabética. Nada é escolhido sozinho: ligar errado daria
 * alerta de preço errado.
 *
 * @example supplyCandidates([{ name: 'Tomate' }, { name: 'Bacon' }], '', 'TOMATE SALADA kg')[0] // { supply: { name: 'Tomate' }, suggested: true }
 */
export function supplyCandidates<S extends { name: string }>(
  supplies: S[],
  query: string,
  description: string,
): SupplyCandidate<S>[] {
  const scored = supplies
    .filter((supply) => matchesSearch(query, supply.name))
    .map((supply) => ({
      supply,
      score: suggestionScore(description, supply.name),
    }));
  const best = Math.max(0, ...scored.map((candidate) => candidate.score));
  return scored
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.supply.name.localeCompare(b.supply.name, 'pt-BR'),
    )
    .map(({ supply, score }) => ({
      supply,
      suggested: best > 0 && score === best,
    }));
}
