import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { parseItemLinkInput } from './item-link-input.js';

/** Corpo válido: o Bacon Seara do Assaí, vendido por kg. */
const BACON = {
  vendorId: 3,
  code: '1128810',
  supplyId: 10,
  baseQuantity: '1',
  productName: 'Bacon Seara kg',
};

describe('parseItemLinkInput', () => {
  it('valida e normaliza corpo correto', () => {
    const parsed = parseItemLinkInput({
      ...BACON,
      code: ' 1128810 ',
      baseQuantity: '36.000',
      label: ' Caixa 36 ',
      productName: ' Bacon Seara kg ',
    });
    expect(parsed).toEqual({
      vendorId: 3,
      code: '1128810',
      supplyId: 10,
      baseQuantity: '36',
      label: 'Caixa 36',
      productName: 'Bacon Seara kg',
    });
  });

  it('aceita label nulo ou ausente', () => {
    expect(parseItemLinkInput(BACON).label).toBeNull();
    expect(parseItemLinkInput({ ...BACON, label: null }).label).toBeNull();
  });

  it('exige o produto com a marca (2 a 60 caracteres)', () => {
    const { productName: _name, ...withoutName } = BACON;
    expect(() => parseItemLinkInput(withoutName)).toThrow(/productName/);
    expect(() => parseItemLinkInput({ ...BACON, productName: ' B ' })).toThrow(
      /productName/,
    );
    expect(() =>
      parseItemLinkInput({ ...BACON, productName: 'x'.repeat(61) }),
    ).toThrow(/productName/);
  });

  it('rejeita corpo que não é objeto', () => {
    expect(() => parseItemLinkInput(null)).toThrow(BadRequestException);
    expect(() => parseItemLinkInput('invalid')).toThrow(BadRequestException);
  });

  it.each([
    ['vendorId inválido', { vendorId: 0 }],
    ['code em branco', { code: '   ' }],
    ['supplyId inválido', { supplyId: -1 }],
    ['baseQuantity zero', { baseQuantity: '0' }],
    ['baseQuantity com mais de 3 casas', { baseQuantity: '1.2345' }],
  ])('rejeita %s', (_case, override) => {
    expect(() => parseItemLinkInput({ ...BACON, ...override })).toThrow(
      BadRequestException,
    );
  });
});
