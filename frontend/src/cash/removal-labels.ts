import { searchKey } from './menu-lookup';
import { SALAD_LABEL, SALAD_SUPPLIES } from './removal-lookup';

/**
 * Como a retirada aparece embaixo do item (o "s/" que o caixa já escrevia na observação).
 *
 * @example removalLabel('Tomate') // 's/ Tomate'
 */
export function removalLabel(name: string): string {
  return `s/ ${name}`;
}

const isSaladPart = (name: string) =>
  SALAD_SUPPLIES.includes(searchKey(name));

const hasWholeSalad = (names: string[]) =>
  SALAD_SUPPLIES.every((wanted) =>
    names.some((name) => searchKey(name) === wanted),
  );

/**
 * As retiradas da linha como aparecem na tela, na comanda e no histórico. Alface e tomate juntos
 * viram um "s/ Salada" no lugar do primeiro (pedido do usuário, 2026-11-08: a tecla Salada saía
 * "s/ Alface" e "s/ Tomate"), mesmo se foram tirados um a um.
 *
 * @example removalLabels(['Alface', 'Tomate', 'Maionese']) // ['s/ Salada', 's/ Maionese']
 */
export function removalLabels(names: string[]): string[] {
  if (!hasWholeSalad(names)) return names.map(removalLabel);
  const first = names.findIndex(isSaladPart);
  return names.flatMap((name, index) => {
    if (index === first) return [removalLabel(SALAD_LABEL)];
    return isSaladPart(name) ? [] : [removalLabel(name)];
  });
}
