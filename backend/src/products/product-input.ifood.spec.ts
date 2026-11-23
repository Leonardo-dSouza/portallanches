import { BadRequestException } from '@nestjs/common';
import { parseProductInput } from './product-input.js';

const X_SALADA = { categoryId: 1, name: 'X Salada', salePrice: '17.80' };

/** Preço no app do iFood (2026-11-23): ausente mantém o atual, null apaga. */
describe('parseProductInput: preço iFood', () => {
  it('ausente fica undefined (o PUT mantém o atual)', () => {
    expect(parseProductInput(X_SALADA).ifoodPrice).toBeUndefined();
  });

  it('null apaga e o valor vem com 2 casas', () => {
    expect(
      parseProductInput({ ...X_SALADA, ifoodPrice: null }).ifoodPrice,
    ).toBeNull();
    expect(
      parseProductInput({ ...X_SALADA, ifoodPrice: 24.9 }).ifoodPrice,
    ).toBe('24.90');
  });

  it('recusa preço negativo', () => {
    expect(() => parseProductInput({ ...X_SALADA, ifoodPrice: '-1' })).toThrow(
      BadRequestException,
    );
  });
});
