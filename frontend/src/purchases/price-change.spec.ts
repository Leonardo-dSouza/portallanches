import { matchesSearch, priceChange } from './price-change';

describe('priceChange', () => {
  it('subiu: seta para cima e a porcentagem com uma casa', () => {
    expect(priceChange('21.5', '20.4')).toEqual({
      direction: 'up',
      label: '+5,4%',
    });
  });

  it('desceu: sinal de menos de verdade', () => {
    expect(priceChange('18', '19.9')).toEqual({
      direction: 'down',
      label: '−9,5%',
    });
  });

  it('igual: 0%', () => {
    expect(priceChange('4.49', '4.4900')).toEqual({
      direction: 'same',
      label: '0%',
    });
  });

  it('sem compra anterior não há variação', () => {
    expect(priceChange('4.49', null)).toBeNull();
  });
});

describe('matchesSearch', () => {
  it('sem acento e sem diferença de maiúsculas', () => {
    expect(matchesSearch('açai', 'ACAI POLPA 1KG')).toBe(true);
    expect(matchesSearch('Coca', 'REF COCA COLA 350ML')).toBe(true);
  });

  it('qualquer um dos campos serve', () => {
    expect(matchesSearch('25767', 'Assaí', '25767')).toBe(true);
    expect(matchesSearch('spani', 'Assaí', '25767')).toBe(false);
  });

  it('busca vazia mostra tudo', () => {
    expect(matchesSearch('   ', 'qualquer')).toBe(true);
  });
});
