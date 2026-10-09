import { parseProductLines } from './product-lines.js';

const LIMITS = { min: 1, max: 3 };

describe('parseProductLines', () => {
  it('lê produto e quantidade de cada linha', () => {
    expect(
      parseProductLines([{ productId: 9, quantity: 2 }], 'items', LIMITS),
    ).toEqual([{ productId: 9, quantity: 2 }]);
  });

  it('rejeita lista fora do tamanho citando o campo', () => {
    expect(() => parseProductLines([], 'items', LIMITS)).toThrow(
      /"items" inválido: recebido \[\], esperado lista de 1 a 3 linhas/,
    );
  });

  it('rejeita quantidade fora de 1 a 99 citando a linha', () => {
    expect(() =>
      parseProductLines([{ productId: 9, quantity: 0 }], 'bundleItems', LIMITS),
    ).toThrow(/"bundleItems\[0\]\.quantity" inválido: recebido 0/);
  });

  it('rejeita o mesmo produto em duas linhas', () => {
    const lines = [
      { productId: 9, quantity: 1 },
      { productId: 9, quantity: 2 },
    ];
    expect(() => parseProductLines(lines, 'items', LIMITS)).toThrow(
      /produto 9 repetido/,
    );
  });
});
