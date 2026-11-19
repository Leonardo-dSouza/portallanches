import { describe, expect, it } from 'vitest';
import { costTabSheet } from '../test-support/cost-tab-fixture';
import {
  profitLine,
  quotientSentence,
  statusSentence,
  suggestedPrice,
} from './cost-text';

const byName = (name: string) =>
  costTabSheet().products.find((p) => p.name === name)!;

describe('profitLine', () => {
  it('na meta mostra só o % do preço', () => {
    expect(profitLine(byName('Hot Dog'))).toBe('16,1% do preço');
  });

  it('perto e abaixo dizem a meta', () => {
    expect(profitLine(byName('X Burguer'))).toBe('9,0% · perto da meta de 10%');
    expect(profitLine(byName('Add Cheddar Fatia'))).toBe(
      '-40,0% · abaixo da meta de 16%',
    );
  });

  it('sem preço não tem linha', () => {
    expect(profitLine(byName('Lanche novo'))).toBeNull();
  });
});

describe('suggestedPrice', () => {
  it('igual ao cardápio ou o PV com a diferença', () => {
    expect(suggestedPrice(byName('Hot Dog'))).toEqual({ same: true });
    expect(suggestedPrice(byName('X Salada'))).toEqual({
      same: false,
      price: 'R$ 17,90',
      diff: '+ 0,30',
    });
    expect(
      suggestedPrice({
        ...byName('X Salada'),
        pv: '18.30',
        salePrice: '19.70',
      }),
    ).toEqual({ same: false, price: 'R$ 18,30', diff: '− 1,40' });
  });

  it('sem PV não sugere', () => {
    expect(suggestedPrice(byName('Coca lata'))).toBeNull();
  });
});

describe('statusSentence', () => {
  it('na meta, perto (com a folga) e abaixo', () => {
    expect(statusSentence(byName('Hot Dog'))).toBe(
      '16,1% do preço: na meta de 16%.',
    );
    expect(statusSentence(byName('X Burguer'))).toBe(
      '9,0% do preço: 1 ponto abaixo da meta de 10%, dentro da folga de 2 pontos.',
    );
    expect(statusSentence(byName('X Salada'))).toBe(
      '15,3% do preço: 0,7 ponto abaixo da meta de 16%, dentro da folga de 2 pontos.',
    );
    expect(statusSentence(byName('Add Cheddar Fatia'))).toBe(
      '-40,0% do preço: 56 pontos abaixo da meta de 16%. Vale rever o preço em Cadastros.',
    );
  });
});

describe('quotientSentence', () => {
  it('centavos abaixo de 5 descem para os 10 centavos mais perto', () => {
    expect(quotientSentence('8.48', '0.4893', '17.30')).toBe(
      'R$ 8,48 ÷ 0,4893 = R$ 17,33, que desce para R$ 17,30',
    );
  });

  it('de 5 centavos para cima sobe', () => {
    expect(quotientSentence('7.68', '0.4293', '17.90')).toBe(
      'R$ 7,68 ÷ 0,4293 = R$ 17,89, que sobe para R$ 17,90',
    );
  });

  it('17,0039 fica R$ 17,00 e não sobe (pedido do usuário, 18/11)', () => {
    expect(quotientSentence('8.32', '0.4893', '17.00')).toBe(
      'R$ 8,32 ÷ 0,4893 = R$ 17,00',
    );
  });

  it('divisão exata não sobe', () => {
    expect(quotientSentence('5.00', '0.5000', '10.00')).toBe(
      'R$ 5,00 ÷ 0,5000 = R$ 10,00',
    );
  });
});
