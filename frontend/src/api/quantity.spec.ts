import { formatQuantity, multiplyQuantities, toApiQuantity } from './quantity';

describe('toApiQuantity', () => {
  it.each([
    ['36', '36'],
    ['2,50', '2.5'],
    [' 0.250 ', '0.25'],
    ['1,125', '1.125'],
  ])('%j vira %j', (typed, api) => {
    expect(toApiQuantity(typed)).toBe(api);
  });

  it.each(['', '2 kg', '-1', '1,2345', '1.000,5'])('rejeita %j', (typed) => {
    expect(toApiQuantity(typed)).toBeNull();
  });
});

it('formatQuantity usa vírgula decimal', () => {
  expect(formatQuantity('2.5')).toBe('2,5');
  expect(formatQuantity('36')).toBe('36');
});

describe('multiplyQuantities', () => {
  it.each([
    ['2', '6', '12'],
    ['1.5', '36', '54'],
    ['0.5', '0.5', '0.25'],
  ])('%s × %s = %s', (a, b, product) => {
    expect(multiplyQuantities(a, b)).toBe(product);
  });

  it('null quando passa de 3 casas', () => {
    expect(multiplyQuantities('0.333', '0.5')).toBeNull();
  });
});
