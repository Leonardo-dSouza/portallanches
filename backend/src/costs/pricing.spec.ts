import {
  ifoodPvFor,
  isBelowTarget,
  marginPercent,
  profitFor,
  pvFor,
} from './pricing.js';

describe('pvFor', () => {
  it('calcula o preço de venda sugerido e arredonda para cima em R$ 0,10', () => {
    // 7,68 ÷ 0,4293 = 17,8896 → sobe para 17,90
    expect(pvFor('7.68', '41.07', '16')).toBe('17.90');
    // 13,16 ÷ 0,4693 = 28,0418 → sobe para 28,10
    expect(pvFor('13.16', '41.07', '12')).toBe('28.10');
    // 8,58 ÷ 0,4293 = 19,986 → 20,00 (não sobe para 20,10)
    expect(pvFor('8.58', '41.07', '16')).toBe('20.00');
  });

  it('devolve null quando o divisor é zero ou negativo', () => {
    expect(pvFor('5.00', '60', '40')).toBeNull();
    expect(pvFor('5.00', '70', '40')).toBeNull();
  });

  it('não sobe quando o resultado já cai exatamente no múltiplo de R$ 0,10', () => {
    // 5,00 ÷ (1 - 0,30 - 0,20) = 5,00 ÷ 0,50 = exatamente 10,00
    expect(pvFor('5.00', '30', '20')).toBe('10.00');
    // 5,01 ÷ 0,50 = 10,02 → sobe para 10,10
    expect(pvFor('5.01', '30', '20')).toBe('10.10');
  });

  it('com CMV zero devolve 0.00', () => {
    expect(pvFor('0.00', '41.07', '16')).toBe('0.00');
  });
});

describe('ifoodPvFor', () => {
  it('calcula o preço sugerido no iFood aplicando margem e comissão com teto de R$ 0,10', () => {
    // 15,19 ÷ 0,4893 ÷ 0,72 = 43,117 → sobe para 43,20
    expect(ifoodPvFor('15.19', '41.07', '10', '28')).toBe('43.20');
  });

  it('devolve null se qualquer divisor for zero ou negativo', () => {
    expect(ifoodPvFor('15.19', '41.07', '10', '100')).toBeNull();
    expect(ifoodPvFor('15.19', '41.07', '10', '105')).toBeNull();
    expect(ifoodPvFor('15.19', '60', '40', '28')).toBeNull();
    expect(ifoodPvFor('15.19', '70', '40', '28')).toBeNull();
  });

  it('não sobe quando o resultado já cai exatamente no múltiplo de R$ 0,10', () => {
    // 4,00 ÷ 0,50 ÷ 0,80 = 4,00 ÷ 0,40 = exatamente 10,00
    expect(ifoodPvFor('4.00', '30', '20', '20')).toBe('10.00');
    // 4,01 ÷ 0,40 = 10,025 → sobe para 10,10
    expect(ifoodPvFor('4.01', '30', '20', '20')).toBe('10.10');
  });

  it('com CMV zero devolve 0.00', () => {
    expect(ifoodPvFor('0.00', '41.07', '10', '28')).toBe('0.00');
  });
});

describe('profitFor', () => {
  it('calcula lucro LRD truncado no centavo em direção a zero', () => {
    // 17,60 − 7,2283 − 7,68 = 2,6917 → 2,69
    expect(profitFor('17.60', '7.68', '41.07')).toBe('2.69');
    // 3,50 − 1,43745 − 3,47 = −1,40745 → −1,40
    expect(profitFor('3.50', '3.47', '41.07')).toBe('-1.40');
  });

  it('trata bordas de lucro nulo ou preço zerado', () => {
    // 10,00 − 5,00 − 5,00 = 0,00
    expect(profitFor('10.00', '5.00', '50')).toBe('0.00');
    // Preço 0 com CMV gera prejuízo equivalente ao CMV
    expect(profitFor('0.00', '5.00', '41.07')).toBe('-5.00');
  });
});

describe('marginPercent', () => {
  it('calcula porcentagem com 1 casa decimal e arredondamento padrão', () => {
    expect(marginPercent('2.69', '17.60')).toBe('15.3');
    expect(marginPercent('-1.40', '3.50')).toBe('-40.0');
    expect(marginPercent('-0.01', '17.60')).toBe('-0.1');
    // Testa formatação de número negativo pequeno sem comer o zero (-0.5 e não -.5)
    expect(marginPercent('-0.05', '10.00')).toBe('-0.5');
    expect(marginPercent('0.05', '10.00')).toBe('0.5');
    expect(marginPercent('0.00', '10.00')).toBe('0.0');
  });

  it('devolve null quando o preço é zero ou inválido', () => {
    expect(marginPercent('2.69', '0.00')).toBeNull();
    expect(marginPercent('2.69', '0')).toBeNull();
  });
});

describe('isBelowTarget', () => {
  it('compara lucro sem truncamento contra o lucro desejado', () => {
    // 2,69 < 17,60 × 16% = 2,816
    expect(isBelowTarget('17.60', '7.68', '41.07', '16')).toBe(true);
    // 2,86847 ≥ 2,864 (se truncasse para 2,86 daria erro)
    expect(isBelowTarget('17.90', '7.68', '41.07', '16')).toBe(false);
  });

  it('quando o lucro é exatamente a meta não está abaixo', () => {
    // 10,00 × (1 - 0,40) - 4,00 = 2,00; meta = 10,00 × 20% = 2,00
    expect(isBelowTarget('10.00', '4.00', '40', '20')).toBe(false);
  });

  it('quando há prejuízo fica abaixo da meta', () => {
    expect(isBelowTarget('10.00', '8.00', '40', '20')).toBe(true);
  });
});
