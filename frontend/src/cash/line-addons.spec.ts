import { BACON, OVO, X_SALADA } from '../test-support/order-menu';
import { changeAddon, maxParentQuantity, setNote } from './line-addons';
import { addLine, type DraftLine } from './order-lines';

const oneXSalada = (quantity = 1): DraftLine[] =>
  addLine([], X_SALADA, quantity);

describe('changeAddon', () => {
  it('põe o adicional na linha, soma de novo e tira no zero', () => {
    const lines = oneXSalada();
    const id = lines[0].id;
    const twice = changeAddon(changeAddon(lines, id, BACON, 1), id, BACON, 1);
    expect(twice[0].addons).toEqual([
      { productId: 33, name: 'Add bacon', unitPrice: '6.00', quantity: 2 },
    ]);
    expect(
      changeAddon(changeAddon(twice, id, BACON, -1), id, BACON, -1)[0].addons,
    ).toEqual([]);
  });

  it('o total do adicional (por unidade × a linha) não passa de 99', () => {
    const lines = oneXSalada(50);
    const id = lines[0].id;
    const two = changeAddon(changeAddon(lines, id, OVO, 1), id, OVO, 1);
    expect(two[0].addons[0].quantity).toBe(1);
  });
});

describe('maxParentQuantity', () => {
  it('limita a linha para o adicional caber em 99', () => {
    const lines = oneXSalada();
    const id = lines[0].id;
    expect(maxParentQuantity(lines[0])).toBe(99);
    const double = changeAddon(changeAddon(lines, id, BACON, 1), id, BACON, 1);
    expect(maxParentQuantity(double[0])).toBe(49);
  });
});

describe('setNote', () => {
  it('apara a observação e corta em 120 caracteres', () => {
    const lines = oneXSalada();
    const id = lines[0].id;
    expect(setNote(lines, id, '  sem tomate ')[0].note).toBe('sem tomate');
    expect(setNote(lines, id, 'x'.repeat(130))[0].note).toHaveLength(120);
  });
});
