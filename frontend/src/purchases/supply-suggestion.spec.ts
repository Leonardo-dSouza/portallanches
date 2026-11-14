import { suggestionScore, supplyCandidates } from './supply-suggestion';

const SUPPLIES = [
  { name: 'Tomate' },
  { name: 'Hambúrguer 56g' },
  { name: 'Hambúrguer artesanal' },
  { name: 'Refrigerante lata' },
  { name: 'Bacon' },
];

describe('suggestionScore', () => {
  it('palavra igual vale 2, sem acento', () => {
    expect(suggestionScore('HAMBURGUER BOV 56G CX36', 'Hambúrguer 56g')).toBe(
      4,
    );
  });

  it('a abreviação da nota vale 1', () => {
    expect(
      suggestionScore('REFRIG ANTARCTICA LATA 350ML', 'Refrigerante lata'),
    ).toBe(3);
  });

  // Visto no dev (2026-11-14): "Sal" aparecia sugerido para o tomate.
  it('o insumo que é só o começo de uma palavra do item não conta', () => {
    expect(suggestionScore('TOMATE SALADA kg', 'Sal')).toBe(0);
    expect(suggestionScore('TOMATE SALADA kg', 'Tomate')).toBe(2);
  });

  it('ignora palavras curtas como "de" e "kg"', () => {
    expect(suggestionScore('PAO DE QUEIJO kg', 'Doce de leite kg')).toBe(0);
  });
});

describe('supplyCandidates', () => {
  it('põe o que mais bate com o item primeiro, marcado como sugerido', () => {
    const list = supplyCandidates(SUPPLIES, '', 'HAMBURGUER BOV 56G CX36');
    expect(list.map((c) => c.supply.name)).toEqual([
      'Hambúrguer 56g',
      'Hambúrguer artesanal',
      'Bacon',
      'Refrigerante lata',
      'Tomate',
    ]);
    expect(list.filter((c) => c.suggested).map((c) => c.supply.name)).toEqual([
      'Hambúrguer 56g',
    ]);
  });

  it('sem nada parecido, nenhum é sugerido e a ordem é alfabética', () => {
    const list = supplyCandidates(SUPPLIES, '', 'DETERGENTE YPE 500ML');
    expect(list.some((c) => c.suggested)).toBe(false);
    expect(list[0].supply.name).toBe('Bacon');
  });

  it('a busca filtra sem acento', () => {
    const list = supplyCandidates(SUPPLIES, 'hamburguer', 'TOMATE SALADA kg');
    expect(list.map((c) => c.supply.name)).toEqual([
      'Hambúrguer 56g',
      'Hambúrguer artesanal',
    ]);
  });
});
