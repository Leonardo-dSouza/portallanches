import { BACON, COCA, OVO, X_SALADA } from '../test-support/order-menu';
import { changeAddon, setNote } from './line-addons';
import { mergeIdenticalLines } from './line-merge';
import { addLine, type DraftLine } from './order-lines';

const summary = (lines: DraftLine[]) =>
  lines.map((l) => [
    l.productId,
    l.quantity,
    l.addons.map((a) => `${a.quantity}× ${a.name}`),
    l.note,
  ]);

/** Linha do X Salada com os adicionais pedidos (na ordem dada) e a observação. */
function saladaWith(
  lines: DraftLine[],
  quantity: number,
  addons: (typeof BACON)[],
  note = '',
): DraftLine[] {
  let next = addLine(lines, X_SALADA, quantity);
  const id = next[next.length - 1].id;
  for (const addon of addons) next = changeAddon(next, id, addon, 1);
  return setNote(next, id, note);
}

describe('mergeIdenticalLines', () => {
  it('junta as linhas iguais na primeira e mantém as diferentes separadas, na ordem', () => {
    let lines = saladaWith([], 1, [BACON]);
    lines = saladaWith(lines, 1, []);
    lines = addLine(lines, COCA, 1);
    lines = saladaWith(lines, 2, [OVO]);
    lines = saladaWith(lines, 1, [OVO]);
    lines = addLine(lines, COCA, 2);
    expect(summary(mergeIdenticalLines(lines))).toEqual([
      [1, 1, ['1× Add bacon'], ''],
      [1, 1, [], ''],
      [5, 3, [], ''],
      [1, 3, ['1× Add ovo'], ''],
    ]);
  });

  it('adicionais em outra ordem contam como iguais', () => {
    let lines = saladaWith([], 1, [BACON, OVO]);
    lines = saladaWith(lines, 1, [OVO, BACON]);
    expect(mergeIdenticalLines(lines)).toHaveLength(1);
    expect(mergeIdenticalLines(lines)[0].quantity).toBe(2);
  });

  it('observação diferente ou outra quantidade do adicional não juntam', () => {
    let lines = saladaWith([], 1, [BACON], 'sem tomate');
    lines = saladaWith(lines, 1, [BACON]);
    lines = saladaWith(lines, 1, [BACON, BACON]);
    expect(summary(mergeIdenticalLines(lines))).toEqual([
      [1, 1, ['1× Add bacon'], 'sem tomate'],
      [1, 1, ['1× Add bacon'], ''],
      [1, 1, ['2× Add bacon'], ''],
    ]);
  });

  it('não passa de 99 numa linha: o resto fica na linha seguinte', () => {
    const lines = addLine(addLine([], COCA, 60), COCA, 50);
    expect(summary(mergeIdenticalLines(lines))).toEqual([
      [5, 99, [], ''],
      [5, 11, [], ''],
    ]);
  });
});
