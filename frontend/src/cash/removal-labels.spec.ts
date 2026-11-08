import { removalLabel, removalLabels } from './removal-labels';

describe('removalLabel', () => {
  it('escreve o "s/" antes do ingrediente', () => {
    expect(removalLabel('Tomate')).toBe('s/ Tomate');
  });
});

describe('removalLabels', () => {
  it('junta alface e tomate num "s/ Salada"', () => {
    expect(removalLabels(['Alface', 'Tomate'])).toEqual(['s/ Salada']);
  });

  it('põe a Salada no lugar do primeiro e mantém o resto na ordem', () => {
    expect(removalLabels(['Maionese', 'Tomate', 'Ovo', 'Alface'])).toEqual([
      's/ Maionese',
      's/ Salada',
      's/ Ovo',
    ]);
  });

  it('casa sem acento nem caixa', () => {
    expect(removalLabels(['ALFACE', 'tomate'])).toEqual(['s/ Salada']);
  });

  it('com só um dos dois, mostra o ingrediente', () => {
    expect(removalLabels(['Tomate', 'Ovo'])).toEqual(['s/ Tomate', 's/ Ovo']);
  });

  it('sem retirada, lista vazia', () => {
    expect(removalLabels([])).toEqual([]);
  });
});
