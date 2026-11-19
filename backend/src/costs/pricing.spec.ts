import {
  ifoodPvFor,
  isBelowTarget,
  marginPercent,
  profitFor,
  pvFor,
  targetStatusFor,
} from './pricing.js';

describe('pvFor', () => {
  it('vai para os 10 centavos mais perto, 5 sobe (pedido do usuário, 18/11)', () => {
    // 7,68 ÷ 0,4293 = 17,8896 → 17,89 → sobe para 17,90
    expect(pvFor('7.68', '41.07', '16')).toBe('17.90');
    // 13,16 ÷ 0,4693 = 28,0418 → 28,04 → desce para 28,00
    expect(pvFor('13.16', '41.07', '12')).toBe('28.00');
    // 8,58 ÷ 0,4293 = 19,986 → 19,99 → 20,00
    expect(pvFor('8.58', '41.07', '16')).toBe('20.00');
    // X Burguer: 8,48 ÷ 0,4893 = 17,3308 → 17,33 → desce para 17,30
    expect(pvFor('8.48', '41.07', '10')).toBe('17.30');
  });

  it('o 5 dos centavos sobe; abaixo de 5 desce', () => {
    // 6,82 ÷ 0,40 = 17,05 → 17,10
    expect(pvFor('6.82', '40', '20')).toBe('17.10');
    // 6,81 ÷ 0,40 = 17,025 → 17,03 → 17,00
    expect(pvFor('6.81', '40', '20')).toBe('17.00');
  });

  it('arredonda para o centavo antes: 17,0039 é 17,00', () => {
    expect(pvFor('8.32', '41.07', '10')).toBe('17.00');
  });

  it('devolve null quando o divisor é zero ou negativo', () => {
    expect(pvFor('5.00', '60', '40')).toBeNull();
    expect(pvFor('5.00', '70', '40')).toBeNull();
  });

  it('exato no múltiplo de R$ 0,10 fica como está', () => {
    // 5,00 ÷ 0,50 = exatamente 10,00
    expect(pvFor('5.00', '30', '20')).toBe('10.00');
    // 5,01 ÷ 0,50 = 10,02 → 10,00
    expect(pvFor('5.01', '30', '20')).toBe('10.00');
  });

  it('com CMV zero devolve 0.00', () => {
    expect(pvFor('0.00', '41.07', '16')).toBe('0.00');
  });
});

describe('ifoodPvFor', () => {
  it('calcula o preço sugerido no iFood aplicando margem e comissão com teto de R$ 0,10', () => {
    // 15,19 ÷ 0,4893 ÷ 0,72 = 43,117 → 43,12 → 43,10
    expect(ifoodPvFor('15.19', '41.07', '10', '28')).toBe('43.10');
    // X Salada: 7,68 ÷ 0,4893 ÷ 0,72 = 21,799 → 21,80
    expect(ifoodPvFor('7.68', '41.07', '10', '28')).toBe('21.80');
  });

  it('arredonda como o PV da loja: centavo, depois os 10 centavos mais perto', () => {
    // 1,27 ÷ 0,4893 ÷ 0,72 = 3,6049 → 3,60
    expect(ifoodPvFor('1.27', '41.07', '10', '28')).toBe('3.60');
  });

  it('devolve null se qualquer divisor for zero ou negativo', () => {
    expect(ifoodPvFor('15.19', '41.07', '10', '100')).toBeNull();
    expect(ifoodPvFor('15.19', '41.07', '10', '105')).toBeNull();
    expect(ifoodPvFor('15.19', '60', '40', '28')).toBeNull();
    expect(ifoodPvFor('15.19', '70', '40', '28')).toBeNull();
  });

  it('exato no múltiplo de R$ 0,10 fica; centavos abaixo de 5 descem', () => {
    // 4,00 ÷ 0,50 ÷ 0,80 = 4,00 ÷ 0,40 = exatamente 10,00
    expect(ifoodPvFor('4.00', '30', '20', '20')).toBe('10.00');
    // 4,01 ÷ 0,40 = 10,025 → 10,03 → 10,00
    expect(ifoodPvFor('4.01', '30', '20', '20')).toBe('10.00');
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

describe('targetStatusFor', () => {
  it('na meta quando o lucro do preço alcança a meta', () => {
    // 17,90: 2,8685 ≥ 17,90 × 16% = 2,864
    expect(targetStatusFor('17.90', '7.68', '41.07', '16')).toBe('ok');
  });

  it('perto da meta até 2 pontos abaixo (o cardápio muda pouco)', () => {
    // X Salada a 17,60: 15,3% contra 16%
    expect(targetStatusFor('17.60', '7.68', '41.07', '16')).toBe('near');
    // X Burguer a 17,00 com meta própria de 10%: 9,0%
    expect(targetStatusFor('17.00', '8.48', '41.07', '10')).toBe('near');
  });

  it('abaixo da meta quando cai mais de 2 pontos', () => {
    // Add Cheddar Fatia: custo 3,47 num preço de 3,50 dá prejuízo
    expect(targetStatusFor('3.50', '3.47', '41.07', '16')).toBe('below');
    // 10,00 × (1 − 0,417) − 4,50 = 1,33: 13,3%, 2,7 pontos abaixo de 16%
    expect(targetStatusFor('10.00', '4.50', '41.70', '16')).toBe('below');
  });

  it('exatamente 2 pontos abaixo ainda é perto', () => {
    // 10,00 × (1 − 0,40) − 4,60 = 1,40 = 14% contra meta de 16%
    expect(targetStatusFor('10.00', '4.60', '40', '16')).toBe('near');
  });

  it('meta menor que a folga não vira "abaixo" por causa da subtração', () => {
    // Meta 1%, lucro 0,5%: a régua do "abaixo" seria −1%
    expect(targetStatusFor('10.00', '5.95', '40', '1')).toBe('near');
  });
});
