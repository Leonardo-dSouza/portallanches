import { BadRequestException } from '@nestjs/common';
import {
  parseIssuedRange,
  parseProductQuery,
  parseVendorNickname,
} from './purchase-input.js';

describe('parseIssuedRange', () => {
  it('vai do início do primeiro dia ao início do dia seguinte ao último, no horário de SP', () => {
    const range = parseIssuedRange('2026-10-01', '2026-10-18');
    expect(range.from.toISOString()).toBe('2026-10-01T03:00:00.000Z');
    expect(range.until.toISOString()).toBe('2026-10-19T03:00:00.000Z');
  });

  it('recusa período invertido', () => {
    expect(() => parseIssuedRange('2026-10-18', '2026-10-01')).toThrow(
      BadRequestException,
    );
  });
});

describe('parseProductQuery', () => {
  it('lê o mercado e o código do produto', () => {
    expect(parseProductQuery('3', ' 1128810 ')).toEqual({
      vendorId: 3,
      code: '1128810',
    });
  });

  it.each([
    ['x', '1'],
    ['0', '1'],
    ['3', ''],
    [undefined, '1'],
  ])('recusa mercado %j e código %j', (vendorId, code) => {
    expect(() => parseProductQuery(vendorId, code)).toThrow(
      BadRequestException,
    );
  });

  it('cita o valor recebido no mercado inválido', () => {
    expect(() => parseProductQuery('x', '1')).toThrow(/"vendorId".*"x"/);
  });
});

describe('parseVendorNickname', () => {
  it('apara o apelido', () => {
    expect(parseVendorNickname({ nickname: '  Assaí ' })).toBe('Assaí');
  });

  it('vazio ou null tira o apelido', () => {
    expect(parseVendorNickname({ nickname: '   ' })).toBeNull();
    expect(parseVendorNickname({ nickname: null })).toBeNull();
  });

  it('recusa apelido longo demais', () => {
    expect(() => parseVendorNickname({ nickname: 'x'.repeat(61) })).toThrow(
      /"nickname"/,
    );
  });
});
