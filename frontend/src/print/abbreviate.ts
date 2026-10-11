import type { TicketAbbreviation } from '../api/types';

const REGEX_SYNTAX = /[.*+?^${}()|[\]\\]/g;
const escapeRegex = (text: string) => text.replace(REGEX_SYNTAX, '\\$&');
const keyOf = (text: string) => text.toLocaleLowerCase('pt-BR');

/**
 * Uma expressão só, com as regras mais compridas antes ("Leite condensado" ganha de "Leite")
 * e uma passada só (uma troca não vira outra). A borda é por letra Unicode: o `\b` do JS não
 * entende "pó" nem "Açaí".
 */
function wholeWordPattern(rules: TicketAbbreviation[]): RegExp {
  const longestFirst = [...rules].sort((a, b) => b.from.length - a.from.length);
  const options = longestFirst.map((rule) => escapeRegex(rule.from)).join('|');
  return new RegExp(
    `(?<![\\p{L}\\p{N}])(?:${options})(?![\\p{L}\\p{N}])`,
    'giu',
  );
}

/**
 * O nome como sai na comanda impressa, com as abreviações de Cadastros → Comanda (pedido do
 * usuário, 2026-10-11). Palavra inteira, sem ligar para maiúscula; se apagar tudo, fica o nome.
 *
 * @example abbreviate('Leite condensado', [{ from: 'leite condensado', to: 'LC' }]) // 'LC'
 */
export function abbreviate(text: string, rules: TicketAbbreviation[]): string {
  if (rules.length === 0) return text;
  const replacements = new Map(
    rules.map((rule) => [keyOf(rule.from), rule.to]),
  );
  const replaced = text.replace(
    wholeWordPattern(rules),
    (match) => replacements.get(keyOf(match)) ?? match,
  );
  return replaced.replace(/\s+/g, ' ').trim() || text;
}
