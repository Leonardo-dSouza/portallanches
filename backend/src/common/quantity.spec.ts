import { BadRequestException } from '@nestjs/common';
import {
  fromMilli,
  multiplyQuantities,
  parseQuantity,
  toMilli,
} from './quantity.js';

describe('parseQuantity', () => {
  it.each([
    [36, '36'],
    ['2.50', '2.5'],
    ['0.250', '0.25'],
    ['007', '7'],
    [1.125, '1.125'],
  ])('normaliza %j para %j', (raw, expected) => {
    expect(parseQuantity(raw, 'quantity', false)).toBe(expected);
  });

  it('aceita zero só quando permitido', () => {
    expect(parseQuantity(0, 'minStock', true)).toBe('0');
    expect(() => parseQuantity(0, 'quantity', false)).toThrow(/"quantity"/);
  });

  it.each([-1, '2,5', '1.2345', 'dez', null])('rejeita %j', (raw) => {
    expect(() => parseQuantity(raw, 'quantity', true)).toThrow(
      BadRequestException,
    );
  });
});

describe('toMilli e fromMilli', () => {
  it.each([
    ['0', 0],
    ['2.5', 2500],
    ['0.25', 250],
    ['36', 36000],
    ['1.125', 1125],
  ])('%j ↔ %j', (quantity, milli) => {
    expect(toMilli(quantity)).toBe(milli);
    expect(fromMilli(milli)).toBe(quantity);
  });
});

describe('multiplyQuantities', () => {
  it.each([
    ['2', '6', '12'],
    ['1.5', '36', '54'],
    ['0.5', '0.5', '0.25'],
  ])('%s × %s = %s', (a, b, product) => {
    expect(multiplyQuantities(a, b)).toBe(product);
  });

  it('recusa resultado com mais de 3 casas', () => {
    expect(multiplyQuantities('0.333', '0.5')).toBeNull();
  });
});
