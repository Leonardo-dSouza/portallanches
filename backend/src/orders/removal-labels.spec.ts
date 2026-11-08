import { removalLabels } from './removal-labels.js';

describe('removalLabels', () => {
  it('junta alface e tomate num "s/ Salada" no lugar do primeiro', () => {
    expect(removalLabels(['Ovo', 'Tomate', 'Alface'])).toEqual([
      's/ Ovo',
      's/ Salada',
    ]);
  });

  it('casa sem acento nem caixa', () => {
    expect(removalLabels(['ALFACE', 'tomate '])).toEqual(['s/ Salada']);
  });

  it('com só um dos dois, mostra o ingrediente', () => {
    expect(removalLabels(['Tomate'])).toEqual(['s/ Tomate']);
  });
});
