import { snapStreet, toStreetKey } from './street-key';

describe('toStreetKey', () => {
  it.each([
    [' R. São João ', 'rua sao joao'],
    ['r joão', 'rua joao'],
    ['Av. Brasil', 'avenida brasil'],
    ['tv   Sete', 'travessa sete'],
    ['Rua Laranjeiras', 'rua laranjeiras'],
  ])('%j vira %j', (typed, key) => {
    expect(toStreetKey(typed)).toBe(key);
  });

  it('não confunde nome que só começa com "r"', () => {
    expect(toStreetKey('Rosas')).toBe('rosas');
  });
});

describe('snapStreet', () => {
  const known = ['Rua Laranjeiras', 'Avenida Brasil'];

  it('usa a grafia cadastrada quando é a mesma rua', () => {
    expect(snapStreet('r. laranjeiras', known)).toBe('Rua Laranjeiras');
    expect(snapStreet('AV BRASIL', known)).toBe('Avenida Brasil');
  });

  it('rua nova fica como digitada, sem espaços nas pontas', () => {
    expect(snapStreet('  Rua Nova ', known)).toBe('Rua Nova');
  });
});
