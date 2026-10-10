import {
  centsToMoney,
  formatAmount,
  formatMoney,
  moneyToCents,
  multiplyMoney,
  toApiMoney,
} from './money';

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

describe('formatAmount', () => {
  it('o valor sem o "R$", para colunas de preço', () => {
    expect(formatAmount('1250.5')).toBe('1.250,50');
    expect(formatAmount('8.00')).toBe('8,00');
  });
});

describe('centavos', () => {
  it('converte da API para centavos inteiros e de volta, sem float', () => {
    expect(moneyToCents('17.8')).toBe(1780);
    expect(moneyToCents('0.05')).toBe(5);
    expect(centsToMoney(6490)).toBe('64.90');
    expect(centsToMoney(5)).toBe('0.05');
  });

  it('multiplica um preço por uma quantidade', () => {
    expect(multiplyMoney('14.20', 2)).toBe('28.40');
    expect(multiplyMoney('0.10', 3)).toBe('0.30');
  });
});
