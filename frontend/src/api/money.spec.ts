import { formatMoney, toApiMoney } from './money';

describe('toApiMoney', () => {
  it.each([
    ['12,50', '12.50'],
    ['12.5', '12.50'],
    ['12,5', '12.50'],
    ['8', '8.00'],
    ['007,00', '7.00'],
    [' 30 ', '30.00'],
  ])('converte %j para %j', (typed, expected) => {
    expect(toApiMoney(typed)).toBe(expected);
  });

  it.each(['', 'R$ 12,50', '1.250,00', '12,345', '-5', '1,,5', 'abc'])(
    'rejeita %j',
    (typed) => {
      expect(toApiMoney(typed)).toBeNull();
    },
  );
});

describe('formatMoney', () => {
  it('usa vírgula, ponto de milhar e 2 casas', () => {
    expect(formatMoney('1250.50')).toBe('R$ 1.250,50');
    expect(formatMoney('8.00')).toBe('R$ 8,00');
    expect(formatMoney('1234567.10')).toBe('R$ 1.234.567,10');
  });
});
