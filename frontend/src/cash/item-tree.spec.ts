import {
  BACON,
  storedItem,
  storedLine,
  X_SALADA,
} from '../test-support/order-menu';
import {
  addonLabel,
  describeItems,
  detailsOf,
  nameWithMark,
  treeOfDraft,
  treeOfOrderItems,
  withoutAddPrefix,
} from './item-tree';
import { changeAddon, setNote } from './line-addons';
import { addLine } from './order-lines';

const acai = (addons = [] as ReturnType<typeof storedLine>[], note = '') =>
  storedItem(storedLine('Açaí 300ml', 'Açaí', 1, '8.50'), addons, note || null);

describe('addonLabel', () => {
  it('"Add bacon" vira "+ bacon"; mais de um por unidade leva a quantidade', () => {
    expect(addonLabel('Add bacon', 1)).toBe('+ bacon');
    expect(addonLabel('Granola', 2)).toBe('+ 2× Granola');
  });
});

describe('treeOfOrderItems', () => {
  it('cada item com o unitário e o total; os adicionais com o preço deles; a observação embaixo', () => {
    const rows = treeOfOrderItems([
      storedItem(
        storedLine('X Salada', 'Tradicional', 2, '17.80', 9),
        [storedLine('Add bacon', 'Adicionais', 2, '6.00')],
        'Sem tomate',
      ),
      storedItem(storedLine('X Burguer', 'Artesanal', 1, '14.70', 1)),
    ]);
    expect(rows.map(({ key: _key, ...row }) => row)).toEqual([
      {
        quantity: 2,
        name: 'X Salada',
        artisanal: false,
        lanche: true,
        unitPrice: '17.80',
        total: '35.60',
        addons: [
          {
            key: expect.any(String),
            label: '+ bacon',
            name: 'bacon',
            perUnit: 1,
            unitPrice: '6.00',
            total: '12.00',
          },
        ],
        note: 'Sem tomate',
      },
      {
        quantity: 1,
        name: 'X Burguer',
        artisanal: true,
        lanche: true,
        unitPrice: '14.70',
        total: '14.70',
        addons: [],
        note: '',
      },
    ]);
  });

  it('lanche é o item com número no cardápio; açaí, bebida e combo não', () => {
    const rows = treeOfOrderItems([
      storedItem(storedLine('X Salada', 'Tradicional', 1, '17.80', 9)),
      acai(),
      storedItem(storedLine('Coca Cola 600ml', 'Refrigerantes', 1)),
    ]);
    expect(rows.map((row) => row.lanche)).toEqual([true, false, false]);
  });

  it('açaí sem adicional sai "Puro"; com adicional, não (a observação não conta)', () => {
    const paçoca = storedLine('Paçoca', 'Adicionais do açaí', 1, '3.50');
    const names = treeOfOrderItems([
      acai(),
      acai([paçoca]),
      acai([], 'pouco leite'),
    ]).map((row) => row.name);
    expect(names).toEqual(['Açaí 300ml Puro', 'Açaí 300ml', 'Açaí 300ml Puro']);
  });
});

describe('treeOfDraft', () => {
  it('a comanda enquanto digita: o adicional por unidade vezes a quantidade do item', () => {
    let lines = addLine([], X_SALADA, 2);
    lines = setNote(
      changeAddon(lines, lines[0].id, BACON, 1),
      lines[0].id,
      'sem tomate',
    );
    const [row] = treeOfDraft(lines);
    expect(row.total).toBe('35.60');
    expect(row.addons.map((a) => [a.label, a.total])).toEqual([
      ['+ bacon', '12.00'],
    ]);
    expect(detailsOf(row)).toEqual(['+ bacon', 'sem tomate']);
  });
});

describe('describeItems', () => {
  it('uma linha de texto (título da lista): sempre a quantidade, artesanal e os detalhes', () => {
    expect(
      describeItems(
        [
          storedItem(
            storedLine('X Salada', 'Tradicional', 2),
            [storedLine('Add bacon', 'Adicionais', 2)],
            'sem tomate',
          ),
          storedItem(storedLine('X Salada', 'Artesanal', 1)),
          storedItem(storedLine('Coca Cola 600ml', 'Refrigerantes', 1)),
        ],
        'Art',
      ),
    ).toBe(
      '2× X Salada (+ bacon; sem tomate), 1× X Salada Art, 1× Coca Cola 600ml',
    );
  });
});

describe('nameWithMark', () => {
  it('só o artesanal leva a marca, depois do nome', () => {
    const [tradicional, artesanal] = treeOfOrderItems([
      storedItem(storedLine('X Salada', 'Tradicional', 1)),
      storedItem(storedLine('X Salada', 'Artesanal', 1)),
    ]);
    expect(nameWithMark(tradicional, 'Art')).toBe('X Salada');
    expect(nameWithMark(artesanal, '(art)')).toBe('X Salada (art)');
  });
});

describe('withoutAddPrefix', () => {
  it('tira só o "Add " do começo', () => {
    expect(withoutAddPrefix('Add Cebola Roxa')).toBe('Cebola Roxa');
    expect(withoutAddPrefix('Leite condensado')).toBe('Leite condensado');
  });
});
