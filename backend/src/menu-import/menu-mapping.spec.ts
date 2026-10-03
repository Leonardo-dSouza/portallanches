import { parseMenuMapping } from './menu-mapping.js';

const VALID = {
  groups: [
    {
      sheet: 'Lanches',
      rows: '2-26',
      category: 'Tradicional',
      descriptions: {
        sheet: 'Cardápio_LT',
        nameColumn: 'b',
        valueColumn: 'c',
      },
    },
  ],
  supplies: [
    { name: 'Tomate', countUnit: 'kg', costCell: 'e17', deductOnSale: false },
  ],
  portions: { f17: [{ supply: 'Tomate', quantity: 0.02 }] },
};

describe('parseMenuMapping', () => {
  it('normaliza células e colunas e aplica padrões', () => {
    expect(parseMenuMapping(VALID)).toEqual({
      groups: [
        {
          sheet: 'Lanches',
          rows: '2-26',
          category: 'Tradicional',
          descriptions: {
            sheet: 'Cardápio_LT',
            nameColumn: 'B',
            valueColumn: 'C',
          },
          numbers: null,
          fixedNumbers: {},
        },
      ],
      supplies: [
        {
          name: 'Tomate',
          countUnit: 'kg',
          costCell: 'E17',
          costPer: '1',
          deductOnSale: false,
          packages: [],
        },
      ],
      portions: { F17: [{ supply: 'Tomate', quantity: '0.02' }] },
    });
  });

  it.each([
    [{ ...VALID, groups: 'x' }, /groups: recebido "x", esperado lista/],
    [
      { ...VALID, groups: [{ ...VALID.groups[0], rows: '26-2' }] },
      /groups\[0\]\.rows/,
    ],
    [
      { ...VALID, supplies: [{ ...VALID.supplies[0], costCell: 'preço' }] },
      /supplies\[0\]\.costCell/,
    ],
    [
      { ...VALID, supplies: [{ ...VALID.supplies[0], costPer: 0 }] },
      /supplies\[0\]\.costPer/,
    ],
    [
      { ...VALID, portions: { F17: [{ supply: 'Tomate', quantity: -1 }] } },
      /portions\.F17\[0\]\.quantity/,
    ],
    [
      { ...VALID, groups: [{ ...VALID.groups[0], fixedNumbers: [30] }] },
      /groups\[0\]\.fixedNumbers: recebido \[30\], esperado objeto/,
    ],
    [
      { ...VALID, groups: [{ ...VALID.groups[0], fixedNumbers: { X: 0 } }] },
      /groups\[0\]\.fixedNumbers\.X: recebido 0, esperado número inteiro maior que zero/,
    ],
    [
      { ...VALID, groups: [{ ...VALID.groups[0], fixedNumbers: { X: '30' } }] },
      /groups\[0\]\.fixedNumbers\.X/,
    ],
  ])('recusa mapeamento inválido citando o caminho (%#)', (raw, message) => {
    expect(() => parseMenuMapping(raw)).toThrow(message);
  });

  it('lê os números fixos do grupo (lanche que falta no Cardápio_LT)', () => {
    const raw = {
      ...VALID,
      groups: [
        { ...VALID.groups[0], fixedNumbers: { 'X Queijo Egg Salada': 30 } },
      ],
    };
    expect(parseMenuMapping(raw).groups[0].fixedNumbers).toEqual({
      'X Queijo Egg Salada': 30,
    });
  });
});
