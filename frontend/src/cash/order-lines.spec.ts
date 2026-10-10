import {
  BACON,
  COCA,
  OVO,
  storedItem,
  storedLine,
  X_SALADA,
} from '../test-support/order-menu';
import { changeAddon, setNote } from './line-addons';
import {
  addLine,
  adjustLast,
  centsToMoney,
  changeQuantity,
  lineLabel,
  lineTotal,
  linesOfOrder,
  previewTotalCents,
  type DraftLine,
} from './order-lines';

describe('addLine', () => {
  it('cada item entra numa linha nova no fim, mesmo repetido (iguais se juntam só ao salvar)', () => {
    let lines = addLine([], X_SALADA, 1);
    lines = addLine(lines, COCA, 1);
    lines = addLine(lines, X_SALADA, 2);
    expect(lines.map((l) => [l.productId, l.quantity])).toEqual([
      [1, 1],
      [5, 1],
      [1, 2],
    ]);
  });

  // Bug de 2026-10-10: o repetido somava na linha pura e o adicional seguinte pegava as duas.
  it('o adicional depois de um item repetido vai só para ele, sem mexer no puro', () => {
    let lines = addLine([], X_SALADA, 1);
    lines = changeAddon(lines, lines[0].id, BACON, 1);
    lines = addLine(lines, X_SALADA, 1);
    lines = addLine(lines, X_SALADA, 1);
    lines = changeAddon(lines, lines[2].id, OVO, 1);
    expect(lines.map((l) => [l.quantity, l.addons.map((a) => a.name)])).toEqual(
      [
        [1, ['Add bacon']],
        [1, []],
        [1, ['Add ovo']],
      ],
    );
  });

  it('não junta na linha que tem adicional ou observação: nasce outra linha', () => {
    let lines = addLine([], X_SALADA, 1);
    lines = changeAddon(lines, lines[0].id, BACON, 1);
    lines = addLine(lines, X_SALADA, 1);
    lines = setNote(addLine(lines, COCA, 1), lines[1].id, 'sem tomate');
    expect(lines.map((l) => [l.productId, l.addons.length, l.note])).toEqual([
      [1, 1, ''],
      [1, 0, 'sem tomate'],
      [5, 0, ''],
    ]);
    expect(new Set(lines.map((l) => l.id)).size).toBe(3);
  });

  it('não passa de 99 por linha', () => {
    expect(addLine([], COCA, 120)[0].quantity).toBe(99);
  });
});

describe('ajustes de quantidade', () => {
  const lines: DraftLine[] = addLine(addLine([], X_SALADA, 1), COCA, 2);

  it('"+" e "-" mexem na última linha; no zero ela sai', () => {
    expect(adjustLast(lines, 1).at(-1)?.quantity).toBe(3);
    expect(adjustLast(adjustLast(lines, -1), -1)).toHaveLength(1);
    expect(adjustLast([], 1)).toEqual([]);
  });

  it('os botões da linha mexem só nela', () => {
    const first = lines[0].id;
    expect(changeQuantity(lines, first, 1).map((l) => l.quantity)).toEqual([
      2, 2,
    ]);
    expect(changeQuantity(lines, first, -1).map((l) => l.productId)).toEqual([
      5,
    ]);
  });
});

describe('totais', () => {
  it('soma em centavos inteiros, com a taxa', () => {
    const lines = addLine(addLine([], X_SALADA, 3), COCA, 1);
    expect(previewTotalCents(lines, '4.50')).toBe(6490);
    expect(previewTotalCents(lines, '')).toBe(6040);
  });

  it('o adicional entra por unidade: 2× (17,80 + 6,00)', () => {
    const [line] = addLine([], X_SALADA, 2);
    const withBacon = changeAddon([line], line.id, BACON, 1);
    expect(lineTotal(withBacon[0])).toBe('47.60');
    expect(previewTotalCents(withBacon, '')).toBe(4760);
  });

  it('centavos no formato da API', () => {
    expect(centsToMoney(6490)).toBe('64.90');
    expect(centsToMoney(5)).toBe('0.05');
  });
});

describe('lineLabel', () => {
  it('nome repetido ganha o número da linha (botões com nomes únicos)', () => {
    let lines = addLine([], X_SALADA, 1);
    lines = changeAddon(lines, lines[0].id, BACON, 1);
    lines = addLine(addLine(lines, X_SALADA, 1), COCA, 1);
    expect(lines.map((l) => lineLabel(lines, l))).toEqual([
      'X Salada (linha 1)',
      'X Salada (linha 2)',
      'Coca Cola 600ml',
    ]);
  });
});

describe('linesOfOrder', () => {
  it('abre o pedido gravado com a observação e o adicional por unidade (preço da época)', () => {
    const lines = linesOfOrder([
      storedItem(
        { ...storedLine('X Salada', 'Tradicional', 2, '15.00'), productId: 1 },
        [
          {
            ...storedLine('Add bacon', 'Adicionais', 4, '6.00'),
            productId: 33,
          },
        ],
        'sem tomate',
      ),
    ]);
    expect(lines).toEqual([
      {
        id: 1,
        productId: 1,
        name: 'X Salada',
        menuNumber: null,
        categoryName: 'Tradicional',
        unitPrice: '15.00',
        quantity: 2,
        note: 'sem tomate',
        addons: [
          { productId: 33, name: 'Add bacon', unitPrice: '6.00', quantity: 2 },
        ],
      },
    ]);
  });
});
