import { BadRequestException } from '@nestjs/common';
import { parseProductInput } from './product-input.js';

const X_SALADA = {
  categoryId: 1,
  name: ' X Salada ',
  salePrice: 17.8,
  components: [
    { supplyId: 4, quantity: '0.036' },
    { supplyId: 7, quantity: 1 },
  ],
};

describe('parseProductInput', () => {
  it('apara textos, normaliza preço e quantidades e nasce ativo', () => {
    expect(parseProductInput(X_SALADA)).toEqual({
      categoryId: 1,
      menuNumber: null,
      name: 'X Salada',
      description: null,
      salePrice: '17.80',
      active: true,
      components: [
        { supplyId: 4, quantity: '0.036' },
        { supplyId: 7, quantity: '1' },
      ],
    });
  });

  it('sem preço e sem composição é válido (item ainda não precificado)', () => {
    expect(
      parseProductInput({ categoryId: 3, name: 'Bacon', description: ' ' }),
    ).toMatchObject({ salePrice: null, description: null, components: [] });
  });

  it('guarda a descrição aparada e respeita active=false', () => {
    const input = parseProductInput({
      ...X_SALADA,
      description: ' Pão, hambúrguer, queijo e salada ',
      active: false,
    });
    expect(input).toMatchObject({
      description: 'Pão, hambúrguer, queijo e salada',
      active: false,
    });
  });

  it('lê o número do cardápio', () => {
    expect(parseProductInput({ ...X_SALADA, menuNumber: 9 }).menuNumber).toBe(
      9,
    );
  });

  it('rejeita o mesmo insumo duas vezes na composição', () => {
    expect(() =>
      parseProductInput({
        ...X_SALADA,
        components: [
          { supplyId: 4, quantity: 1 },
          { supplyId: 4, quantity: 2 },
        ],
      }),
    ).toThrow(/supplyId 4 aparece mais de uma vez/);
  });

  it.each([
    [{ categoryId: 0 }, /"categoryId"/],
    [{ menuNumber: 0 }, /"menuNumber"/],
    [{ menuNumber: '9' }, /"menuNumber"/],
    [{ name: '' }, /"name"/],
    [{ salePrice: '17,80' }, /"salePrice"/],
    [{ components: 'pão' }, /"components"/],
    [
      { components: [{ supplyId: 4, quantity: 0 }] },
      /components\[0\]\.quantity/,
    ],
    [
      { components: [{ supplyId: 'x', quantity: 1 }] },
      /components\[0\]\.supplyId/,
    ],
    [{ description: 'x'.repeat(301) }, /"description"/],
  ])('rejeita %j', (override, message) => {
    expect(() => parseProductInput({ ...X_SALADA, ...override })).toThrow(
      message,
    );
  });

  it('rejeita corpo que não é objeto', () => {
    expect(() => parseProductInput([])).toThrow(BadRequestException);
  });
});
