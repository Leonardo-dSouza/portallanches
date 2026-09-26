import { parseCellAddress } from './cell-address.js';
import type { FormulaCell, FormulaGrid, MenuMapping } from './menu-types.js';

/** Conteúdo de célula nos testes: número/texto digitado ou `'=fórmula'` com o resultado. */
type FixtureCell = string | number | [formula: string, result: number];

/**
 * Monta uma aba a partir de endereços do Excel, para testar o plano sem planilha real.
 *
 * @example gridOf({ B2: 'X Salada', D2: ['=itens_custos!F6', 1.44] })
 */
export function gridOf(cells: Record<string, FixtureCell>): FormulaGrid {
  const grid: FormulaGrid = [];
  for (const [address, content] of Object.entries(cells)) {
    const { row, column } = parseCellAddress(address)!;
    grid[row] ??= [];
    grid[row][column] = toCell(content);
  }
  return grid;
}

function toCell(content: FixtureCell): FormulaCell {
  if (Array.isArray(content))
    return { value: content[1], formula: content[0].replace(/^=/, '') };
  return { value: content, formula: null };
}

/** Planilha de custos mínima: queijo a R$ 40/kg, hambúrguer em caixa de 36 a R$ 36. */
export const COSTS = gridOf({
  E6: 40,
  F6: ['=(E6/1000)*36', 1.44],
  E8: 36,
  F8: ['=E8/C8', 1],
  E25: 0.5,
});

/** Mapeamento mínimo que acompanha `COSTS`. */
export const MAPPING: MenuMapping = {
  groups: [
    {
      sheet: 'Lanches',
      rows: '2-4',
      category: 'Tradicional',
      descriptions: null,
    },
  ],
  supplies: [
    {
      name: 'Queijo bandeja',
      countUnit: 'kg',
      costCell: 'E6',
      costPer: '1',
      deductOnSale: true,
      packages: [],
    },
    {
      name: 'Hambúrguer 56g',
      countUnit: 'un',
      costCell: 'E8',
      costPer: '36',
      deductOnSale: true,
      packages: [{ name: 'caixa', quantity: '36' }],
    },
    {
      name: 'Hamburgueira',
      countUnit: 'un',
      costCell: 'E25',
      costPer: '1',
      deductOnSale: true,
      packages: [],
    },
  ],
  portions: {
    F6: [{ supply: 'Queijo bandeja', quantity: '0.036' }],
    F8: [{ supply: 'Hambúrguer 56g', quantity: '1' }],
    H44: [
      { supply: 'Hamburgueira', quantity: '1' },
      { supply: 'Queijo bandeja', quantity: '0.01' },
    ],
  },
};
