/** Nome como foi digitado e a chave normalizada (mesma pessoa = mesma chave). */
export interface ConsumerNameRow {
  consumerName: string;
  consumerKey: string;
}

/**
 * Sugestões do "Para quem": um nome por chave, a grafia da linha mais recente, até `limit`.
 * As linhas chegam da mais nova para a mais antiga.
 *
 * @example uniqueRecentNames([{ consumerName: 'Bianca', consumerKey: 'bianca' }], 20) // ['Bianca']
 */
export function uniqueRecentNames(
  rows: ConsumerNameRow[],
  limit: number,
): string[] {
  const byKey = new Map<string, string>();
  for (const { consumerKey, consumerName } of rows) {
    if (byKey.size === limit) break;
    if (!byKey.has(consumerKey)) byKey.set(consumerKey, consumerName);
  }
  return [...byKey.values()];
}
