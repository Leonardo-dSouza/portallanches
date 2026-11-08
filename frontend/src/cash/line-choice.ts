import { lineMark } from './edit-marks';
import type { MenuItem } from './menu-lookup';
import type { DraftLine } from './order-lines';

const byKeyOrder = (a: MenuItem, b: MenuItem) =>
  a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'pt-BR');

const menuItemOf = (menu: MenuItem[], line: DraftLine) =>
  menu.find((item) => item.id === line.productId);

/**
 * As opções da escolha obrigatória da linha (o pão do artesanal, 2026-11-08), na ordem das
 * teclas 1, 2, 3 (Cadastros → Categorias). Vazio = o item não tem escolha.
 *
 * @example choiceOptions(menu, xSaladaArt).map((o) => o.name) // ['Pão Gergelim', 'Pão Brioche', 'Pão Tradicional']
 */
export function choiceOptions(menu: MenuItem[], line: DraftLine): MenuItem[] {
  const categoryId = menuItemOf(menu, line)?.choiceCategoryId ?? null;
  if (categoryId === null) return [];
  return menu.filter((item) => item.categoryId === categoryId).sort(byKeyOrder);
}

/** Nome da escolha para os avisos: "o pão" quando a categoria é Pão, senão a categoria. */
export function choiceSubject(options: MenuItem[]): string {
  const category = options[0]?.categoryName ?? 'opção';
  return category.toLowerCase() === 'pão' ? 'o pão' : category;
}

/**
 * A linha ainda precisa da escolha: o item pede (pela categoria) e nada foi escolhido. A linha
 * gravada antes da regra, sem escolha, não precisa enquanto não mudar (decisão do usuário,
 * 2026-11-08; a API confere igual).
 *
 * @example choicePending(menu, linhaSemPao, []) // true
 */
export function choicePending(
  menu: MenuItem[],
  line: DraftLine,
  saved: DraftLine[],
): boolean {
  if (line.choice !== null || choiceOptions(menu, line).length === 0)
    return false;
  const untouched = line.savedId !== undefined && lineMark(line, saved) === null;
  return !untouched;
}

/**
 * A primeira linha que ainda precisa da escolha; undefined = nenhuma.
 *
 * @example firstPendingChoice(lines, menu, saved)?.name // 'X Salada'
 */
export function firstPendingChoice(
  lines: DraftLine[],
  menu: MenuItem[],
  saved: DraftLine[],
): DraftLine | undefined {
  return lines.find((line) => choicePending(menu, line, saved));
}

/**
 * Põe (ou troca) a escolha de uma linha, com o preço do dia da opção.
 *
 * @example setChoice(lines, 3, paoBrioche)
 */
export function setChoice(
  lines: DraftLine[],
  lineId: number,
  option: MenuItem,
): DraftLine[] {
  const choice = {
    productId: option.id,
    name: option.name,
    unitPrice: option.salePrice,
  };
  return lines.map((line) => (line.id === lineId ? { ...line, choice } : line));
}

/**
 * O cardápio sem as opções de escolha: o pão sozinho não se vende (nem na busca, nem no número,
 * nem na grade do celular); ele só entra preso ao lanche.
 *
 * @example sellableMenu(menu).some((item) => item.name === 'Pão Brioche') // false
 */
export function sellableMenu(menu: MenuItem[]): MenuItem[] {
  const choiceCategories = new Set(
    menu.flatMap((item) =>
      item.choiceCategoryId === null ? [] : [item.choiceCategoryId],
    ),
  );
  return menu.filter((item) => !choiceCategories.has(item.categoryId));
}
