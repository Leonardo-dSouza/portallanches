import {
  BadRequestException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  assertOutsidePositions,
  latestOutsideCodes,
  suggestedOutsidePositions,
} from './outside-items.js';

describe('assertOutsidePositions', () => {
  it('aceita nenhuma ou algumas posições da nota', () => {
    expect(() => assertOutsidePositions([], 3)).not.toThrow();
    expect(() => assertOutsidePositions([1, 3], 3)).not.toThrow();
  });

  it('posição fora da nota é 400 com a posição e o intervalo', () => {
    expect(() => assertOutsidePositions([4], 3)).toThrow(BadRequestException);
    expect(() => assertOutsidePositions([4], 3)).toThrow(
      'Item 4 não existe na nota (itens 1 a 3)',
    );
  });

  it('a nota inteira fora da lanchonete não é gasto (422)', () => {
    expect(() => assertOutsidePositions([1, 2, 3], 3)).toThrow(
      UnprocessableEntityException,
    );
    expect(() => assertOutsidePositions([3, 1, 2], 3)).toThrow(
      'A nota inteira está fora da lanchonete (3 de 3 itens): tire a nota do gasto ou desmarque um item',
    );
  });
});

describe('latestOutsideCodes', () => {
  it('vale a decisão da nota mais recente de cada código', () => {
    // Da mais nova para a mais antiga, como o repositório devolve.
    const codes = latestOutsideCodes([
      { code: 'pao', outsideBusiness: true },
      { code: 'bacon', outsideBusiness: false },
      { code: 'bacon', outsideBusiness: true },
      { code: 'pao', outsideBusiness: false },
    ]);
    expect([...codes]).toEqual(['pao']);
  });
});

describe('suggestedOutsidePositions', () => {
  it('marca as linhas com código lembrado (o produto repetido em várias linhas também)', () => {
    const items = [
      { position: 1, code: 'bacon' },
      { position: 2, code: 'pao' },
      { position: 3, code: 'pao' },
    ];
    expect(suggestedOutsidePositions(items, new Set(['pao']))).toEqual([2, 3]);
  });
});
