import { abbreviate } from './abbreviate';

const LEITES = [
  { from: 'Leite', to: 'L' },
  { from: 'Leite condensado', to: 'LC' },
  { from: 'Leite em pó', to: 'LP' },
];

describe('abbreviate', () => {
  it('troca o texto inteiro sem ligar para maiúscula', () => {
    expect(abbreviate('Leite Condensado', LEITES)).toBe('LC');
    expect(abbreviate('leite em pó', LEITES)).toBe('LP');
  });

  it('a regra mais comprida ganha, e uma troca não vira outra', () => {
    expect(abbreviate('Leite condensado', LEITES)).toBe('LC');
    expect(abbreviate('Leite ninho', LEITES)).toBe('L ninho');
    expect(abbreviate('LC extra', [{ from: 'LC', to: 'Leite' }])).toBe(
      'Leite extra',
    );
  });

  it('só palavra inteira: o "X" não pega "Xis" nem o meio de "CalaBacon"', () => {
    const rules = [
      { from: 'X', to: '' },
      { from: 'Bacon', to: 'Bcn' },
    ];
    expect(abbreviate('X Bacon Salada', rules)).toBe('Bcn Salada');
    expect(abbreviate('Xis CalaBacon', rules)).toBe('Xis CalaBacon');
  });

  it('palavra com acento no fim ou no começo ("pó", "Açaí") também é inteira', () => {
    expect(abbreviate('Paçoca em pó', [{ from: 'pó', to: 'p' }])).toBe(
      'Paçoca em p',
    );
    expect(abbreviate('Pólen', [{ from: 'pó', to: 'p' }])).toBe('Pólen');
    expect(abbreviate('Açaí 300ml', [{ from: 'Açaí', to: 'Acai' }])).toBe(
      'Acai 300ml',
    );
  });

  it('aceita texto com sinais ("(lata)", "2l.") sem virar expressão regular', () => {
    const rules = [
      { from: '(lata)', to: 'lt' },
      { from: '2l.', to: '2L' },
      { from: '$&', to: 'x' },
    ];
    expect(abbreviate('Coca (lata)', rules)).toBe('Coca lt');
    expect(abbreviate('Guaraná 2l.', rules)).toBe('Guaraná 2L');
  });

  it('apagar no meio junta os espaços; se apagar tudo, fica o nome original', () => {
    expect(abbreviate('Bacon X Salada', [{ from: 'X', to: '' }])).toBe(
      'Bacon Salada',
    );
    expect(abbreviate('Bis', [{ from: 'Bis', to: '' }])).toBe('Bis');
  });

  it('sem regras, o nome não muda', () => {
    expect(abbreviate('X Salada', [])).toBe('X Salada');
  });
});
