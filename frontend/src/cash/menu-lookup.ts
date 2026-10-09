import type { SaleMenuItem } from '../api/types';

/** Item do cardápio que pode entrar num pedido (a API já manda só o vendável no dia). */
export type MenuItem = SaleMenuItem;

/** Tradicional e artesanal repetem os números; o ponto no fim escolhe o artesanal. */
const ARTISANAL_CATEGORY = 'Artesanal';
const MAX_RESULTS = 8;

const searchKey = (text: string): string =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

/**
 * Item pelo número do cardápio impresso. Se o número só existe numa categoria (27 só no
 * artesanal, 1 só no tradicional), vale com ou sem ponto.
 *
 * @example findByNumber(menu, 9, true)?.categoryName // 'Artesanal'
 */
export function findByNumber(
  menu: MenuItem[],
  number: number,
  artisanal: boolean,
): MenuItem | null {
  const same = menu.filter((item) => item.menuNumber === number);
  const wanted = same.filter(
    (item) => (item.categoryName === ARTISANAL_CATEGORY) === artisanal,
  );
  if (wanted.length > 0) return wanted[0];
  return same.length === 1 ? same[0] : null;
}

/** 0 = o nome começa com a busca; 1 = alguma palavra começa; 2 = só contém. */
function rankOf(name: string, query: string): number {
  if (name.startsWith(query)) return 0;
  const first = query.split(' ')[0];
  return name.split(' ').some((word) => word.startsWith(first)) ? 1 : 2;
}

/**
 * Busca por nome, sem acento nem caixa: todas as palavras digitadas precisam aparecer.
 *
 * @example searchMenu(menu, 'acai 5')[0].name // 'Açaí 500ml'
 */
export function searchMenu(menu: MenuItem[], typed: string): MenuItem[] {
  const query = searchKey(typed);
  if (!query) return [];
  const tokens = query.split(' ');
  return menu
    .map((item) => ({ item, name: searchKey(item.name) }))
    .filter(({ name }) => tokens.every((token) => name.includes(token)))
    .map((found) => ({ ...found, rank: rankOf(found.name, query) }))
    .sort((a, b) => a.rank - b.rank || a.name.localeCompare(b.name))
    .slice(0, MAX_RESULTS)
    .map(({ item }) => item);
}
