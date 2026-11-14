import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { parseItemLinkInput } from './item-link-input.js';

describe('parseItemLinkInput', () => {
  it('valida e normaliza corpo correto', () => {
    const parsed = parseItemLinkInput({
      vendorId: 3,
      code: ' 1128810 ',
      supplyId: 10,
      baseQuantity: '36.000',
      label: ' Caixa 36 ',
    });
    expect(parsed).toEqual({
      vendorId: 3,
      code: '1128810',
      supplyId: 10,
      baseQuantity: '36',
      label: 'Caixa 36',
    });
  });

  it('aceita label nulo ou ausente', () => {
    expect(
      parseItemLinkInput({
        vendorId: 3,
        code: '1128810',
        supplyId: 10,
        baseQuantity: '1.5',
      }),
    ).toEqual({
      vendorId: 3,
      code: '1128810',
      supplyId: 10,
      baseQuantity: '1.5',
      label: null,
    });

    expect(
      parseItemLinkInput({
        vendorId: 3,
        code: '1128810',
        supplyId: 10,
        baseQuantity: '1.5',
        label: null,
      }),
    ).toEqual({
      vendorId: 3,
      code: '1128810',
      supplyId: 10,
      baseQuantity: '1.5',
      label: null,
    });
  });

  it('rejeita corpo que não é objeto', () => {
    expect(() => parseItemLinkInput(null)).toThrow(BadRequestException);
    expect(() => parseItemLinkInput('invalid')).toThrow(BadRequestException);
  });

  it('rejeita vendorId inválido', () => {
    expect(() =>
      parseItemLinkInput({
        vendorId: 0,
        code: '1128810',
        supplyId: 10,
        baseQuantity: '1',
      }),
    ).toThrow(BadRequestException);
  });

  it('rejeita code vazio ou em branco', () => {
    expect(() =>
      parseItemLinkInput({
        vendorId: 3,
        code: '   ',
        supplyId: 10,
        baseQuantity: '1',
      }),
    ).toThrow(BadRequestException);
  });

  it('rejeita supplyId inválido', () => {
    expect(() =>
      parseItemLinkInput({
        vendorId: 3,
        code: '1128810',
        supplyId: -1,
        baseQuantity: '1',
      }),
    ).toThrow(BadRequestException);
  });

  it('rejeita baseQuantity zero ou negativa', () => {
    expect(() =>
      parseItemLinkInput({
        vendorId: 3,
        code: '1128810',
        supplyId: 10,
        baseQuantity: '0',
      }),
    ).toThrow(BadRequestException);
  });

  it('rejeita baseQuantity com mais de 3 casas decimais', () => {
    expect(() =>
      parseItemLinkInput({
        vendorId: 3,
        code: '1128810',
        supplyId: 10,
        baseQuantity: '1.2345',
      }),
    ).toThrow(BadRequestException);
  });
});
