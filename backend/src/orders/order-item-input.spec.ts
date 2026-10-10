import { BadRequestException } from '@nestjs/common';
import { parseOrderItems, productIdsOf } from './order-item-input.js';

describe('parseOrderItems', () => {
  it('linha simples vem sem observação e sem adicionais', () => {
    expect(parseOrderItems([{ productId: 9, quantity: 2 }])).toEqual([
      { productId: 9, quantity: 2, note: null, addons: [] },
    ]);
  });

  it('lê adicionais (por unidade) e a observação aparada', () => {
    const [line] = parseOrderItems([
      {
        productId: 9,
        quantity: 2,
        note: '  sem tomate ',
        addons: [{ productId: 33, quantity: 1 }],
      },
    ]);
    expect(line).toEqual({
      productId: 9,
      quantity: 2,
      note: 'sem tomate',
      addons: [{ productId: 33, quantity: 1 }],
    });
  });

  it('o mesmo produto pode vir em duas linhas (um puro, outro com bacon)', () => {
    const lines = parseOrderItems([
      { productId: 9, quantity: 1 },
      { productId: 9, quantity: 1, addons: [{ productId: 33, quantity: 1 }] },
    ]);
    expect(lines).toHaveLength(2);
  });

  it('observação em branco vira null; acima de 120 caracteres é recusada', () => {
    expect(
      parseOrderItems([{ productId: 9, quantity: 1, note: '  ' }])[0].note,
    ).toBeNull();
    expect(() =>
      parseOrderItems([{ productId: 9, quantity: 1, note: 'x'.repeat(121) }]),
    ).toThrow(/"items\[0\]\.note"/);
  });

  it('adicional não leva adicional nem observação, e não repete na linha', () => {
    const nested = { productId: 33, quantity: 1, note: 'bem passado' };
    expect(() =>
      parseOrderItems([{ productId: 9, quantity: 1, addons: [nested] }]),
    ).toThrow(/adicional não leva adicionais nem observação/);
    const twice = [
      { productId: 33, quantity: 1 },
      { productId: 33, quantity: 1 },
    ];
    expect(() =>
      parseOrderItems([{ productId: 9, quantity: 1, addons: twice }]),
    ).toThrow(/produto 33 repetido/);
  });

  it('o total do adicional (por unidade × quantidade da linha) passa de 99 → 400', () => {
    expect(() =>
      parseOrderItems([
        {
          productId: 9,
          quantity: 50,
          addons: [{ productId: 33, quantity: 2 }],
        },
      ]),
    ).toThrow(BadRequestException);
  });

  it('lista vazia ou com mais de 50 linhas é recusada', () => {
    expect(() => parseOrderItems([])).toThrow(/"items"/);
    const many = Array.from({ length: 51 }, (_, i) => ({
      productId: i + 1,
      quantity: 1,
    }));
    expect(() => parseOrderItems(many)).toThrow(/1 a 50/);
  });
});

describe('productIdsOf', () => {
  it('junta os produtos das linhas e dos adicionais, sem repetir', () => {
    const items = parseOrderItems([
      { productId: 9, quantity: 1, addons: [{ productId: 33, quantity: 1 }] },
      { productId: 9, quantity: 1 },
      { productId: 60, quantity: 1 },
    ]);
    expect(productIdsOf(items)).toEqual([9, 33, 60]);
  });
});
