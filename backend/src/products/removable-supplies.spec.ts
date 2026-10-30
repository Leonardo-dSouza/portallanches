import { removablesOf } from './removable-supplies.js';

const component = (supplyId: number, name: string, section: string | null) => ({
  supplyId,
  supply: { name, section: section === null ? null : { name: section } },
});

describe('removablesOf', () => {
  const components = [
    component(1, 'Tomate', 'Geladeira'),
    component(2, 'Hamburgueira lanche', 'Embalagens'),
    component(3, 'Saco kraft', 'Papelaria e sacolas'),
    component(4, 'Ketchup sachê', 'Armário'),
    component(5, 'Alface', 'Geladeira'),
    component(6, 'Pão de hambúrguer', 'Alimentos'),
    component(7, 'Sem seção', null),
  ];

  it('lista o que o caixa pode tirar, sem embalagem e sachê, por nome', () => {
    expect(
      removablesOf({ menuNumber: 9, isBundle: false }, components),
    ).toEqual([
      { supplyId: 5, name: 'Alface' },
      { supplyId: 6, name: 'Pão de hambúrguer' },
      { supplyId: 7, name: 'Sem seção' },
      { supplyId: 1, name: 'Tomate' },
    ]);
  });

  it('só lanche: sem número no cardápio não oferece nada', () => {
    expect(
      removablesOf({ menuNumber: null, isBundle: false }, components),
    ).toEqual([]);
  });

  it('combo não oferece nada', () => {
    expect(removablesOf({ menuNumber: 3, isBundle: true }, components)).toEqual(
      [],
    );
  });
});
