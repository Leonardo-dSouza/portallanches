import { toNeighborhoodKey } from '../delivery/neighborhood-key.js';

// A tecla Salada do caixa tira os dois (frontend `cash/removal-lookup.ts`, 2026-10-30).
const SALAD_LABEL = 'Salada';
const SALAD_SUPPLIES = ['alface', 'tomate'];

const removalLabel = (name: string) => `s/ ${name}`;

const isSaladPart = (name: string) =>
  SALAD_SUPPLIES.includes(toNeighborhoodKey(name));

const hasWholeSalad = (names: string[]) =>
  SALAD_SUPPLIES.every((wanted) =>
    names.some((name) => toNeighborhoodKey(name) === wanted),
  );

/**
 * As retiradas como o histórico do pedido mostra, iguais à tela: alface e tomate juntos viram um
 * "s/ Salada" no lugar do primeiro (pedido do usuário, 2026-11-08).
 *
 * @example removalLabels(['Alface', 'Tomate', 'Ovo']) // ['s/ Salada', 's/ Ovo']
 */
export function removalLabels(names: string[]): string[] {
  if (!hasWholeSalad(names)) return names.map(removalLabel);
  const first = names.findIndex(isSaladPart);
  return names.flatMap((name, index) => {
    if (index === first) return [removalLabel(SALAD_LABEL)];
    return isSaladPart(name) ? [] : [removalLabel(name)];
  });
}
