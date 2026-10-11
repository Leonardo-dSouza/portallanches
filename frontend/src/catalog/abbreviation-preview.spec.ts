import { paperNameChanges } from './abbreviation-preview';

describe('paperNameChanges', () => {
  it('só os nomes que mudam no papel, uma vez cada, com o adicional sem o "Add"', () => {
    expect(
      paperNameChanges(
        [
          'X Salada',
          'X Salada',
          'Coca Cola 600ml',
          'Add bacon',
          'Leite condensado',
        ],
        [
          { from: 'X', to: '' },
          { from: 'bacon', to: 'bcn' },
          { from: 'Leite condensado', to: 'LC' },
        ],
      ),
    ).toEqual([
      { before: 'X Salada', after: 'Salada' },
      { before: 'bacon', after: 'bcn' },
      { before: 'Leite condensado', after: 'LC' },
    ]);
  });

  it('sem abreviação, nada muda', () => {
    expect(paperNameChanges(['X Salada'], [])).toEqual([]);
  });
});
