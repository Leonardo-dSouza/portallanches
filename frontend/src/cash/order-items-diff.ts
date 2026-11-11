// O que mudou nos itens de um pedido editado, para o histórico do pop-up (2026-11-10, pedido do
// dono: o "antes → depois" repetia a lista inteira duas vezes). O histórico guarda os itens numa
// linha só ("2× X Salada (+2 Add bacon, sem tomate), 1× Coca Cola 600ml", `describeEntries` do
// backend), então a comparação é pelo texto de cada item.

/** Cada item da linha, sem cortar as vírgulas de dentro dos parênteses; null se não fechar. */
function splitItems(text: string): string[] | null {
  const items: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '(') depth++;
    if (text[i] === ')') depth--;
    if (depth < 0) return null;
    if (depth > 0 || !text.startsWith(', ', i)) continue;
    items.push(text.slice(start, i));
    start = i + 2;
  }
  if (depth !== 0) return null;
  return [...items, text.slice(start)].filter((item) => item !== '');
}

const ITEM = /^(\d+)× (.+)$/;

/** Quantidade por item (o texto depois do "N× "), somando linhas iguais, na ordem da lista. */
function countItems(text: string): Map<string, number> | null {
  const items = splitItems(text);
  if (!items) return null;
  const counts = new Map<string, number>();
  for (const item of items) {
    const match = ITEM.exec(item);
    if (!match) return null;
    counts.set(match[2], (counts.get(match[2]) ?? 0) + Number(match[1]));
  }
  return counts;
}

function diffCounts(
  before: Map<string, number>,
  after: Map<string, number>,
): string[] {
  const changes: string[] = [];
  for (const [name, now] of after) {
    const was = before.get(name) ?? 0;
    if (was === 0) changes.push(`entrou ${now}× ${name}`);
    else if (was !== now) changes.push(`${name} ${was}× → ${now}×`);
  }
  for (const [name, was] of before)
    if (!after.has(name)) changes.push(`saiu ${was}× ${name}`);
  return changes;
}

/**
 * Só o que mudou nos itens: o que entrou, o que saiu e a quantidade trocada; null se nada mudou.
 * Texto que não dá para separar (parêntese aberto na observação) volta inteiro, antes → depois.
 *
 * @example itemsChangeText('1× Hot Bacon', '1× Hot Bacon, 1× Coca Cola 600ml') // 'entrou 1× Coca Cola 600ml'
 */
export function itemsChangeText(before: string, after: string): string | null {
  if (before === after) return null;
  const was = countItems(before);
  const now = countItems(after);
  if (!was || !now) return `${before} → ${after}`;
  const changes = diffCounts(was, now);
  return changes.length > 0 ? changes.join(' · ') : null;
}
