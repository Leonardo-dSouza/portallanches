import type { Product } from '../api/types';
import { findByNumber, menuItemsOf, searchMenu } from './menu-lookup';

const product = (
  id: number,
  name: string,
  categoryName: string,
  menuNumber: number | null,
  salePrice: string | null = '10.00',
  active = true,
): Product => ({
  id,
  name,
  categoryName,
  categoryId: 1,
  menuNumber,
  salePrice,
  active,
  description: null,
  components: [],
  cmv: '0.00',
  cmvComplete: true,
  cmvPercent: null,
});

const PRODUCTS = [
  product(1, 'X Salada', 'Tradicional', 9, '17.80'),
  product(2, 'X Salada', 'Artesanal', 9, '25.90'),
  product(3, 'X Burguer Duplo', 'Artesanal', 27),
  product(4, 'Hot Dog', 'Tradicional', 1),
  product(5, 'Coca Cola 600ml', 'Refrigerantes', null, '7.00'),
  product(6, 'Coca Cola 2l', 'Refrigerantes', null),
  product(7, 'Açaí 500ml', 'Açaí', null, '12.50'),
  product(8, 'X Bacon Salada', 'Tradicional', 10),
  product(9, 'Sem preço', 'Tradicional', 50, null),
  product(10, 'Inativo', 'Tradicional', 51, '5.00', false),
];
const MENU = menuItemsOf(PRODUCTS);

describe('menuItemsOf', () => {
  it('só entra item ativo e com preço', () => {
    expect(MENU.map((i) => i.id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });
});

describe('findByNumber', () => {
  it('sem ponto é o tradicional; com ponto, o artesanal', () => {
    expect(findByNumber(MENU, 9, false)?.id).toBe(1);
    expect(findByNumber(MENU, 9, true)?.id).toBe(2);
  });

  it('número que só existe numa categoria vale com ou sem ponto', () => {
    expect(findByNumber(MENU, 27, false)?.id).toBe(3);
    expect(findByNumber(MENU, 1, true)?.id).toBe(4);
  });

  it('número fora do cardápio (ou sem preço) não acha nada', () => {
    expect(findByNumber(MENU, 99, false)).toBeNull();
    expect(findByNumber(MENU, 50, false)).toBeNull();
  });
});

describe('searchMenu', () => {
  it('sem acento nem caixa, todas as palavras precisam aparecer', () => {
    expect(searchMenu(MENU, 'ACAI 5').map((i) => i.id)).toEqual([7]);
    expect(searchMenu(MENU, 'coca 6').map((i) => i.id)).toEqual([5]);
  });

  it('quem começa com a busca vem antes de quem só contém', () => {
    expect(searchMenu(MENU, 'sal').map((i) => i.name)).toEqual([
      'X Bacon Salada',
      'X Salada',
      'X Salada',
    ]);
    expect(searchMenu(MENU, 'x sal').map((i) => i.id)).toEqual([1, 2, 8]);
  });

  it('no máximo 8 resultados e nada para busca vazia', () => {
    const many = menuItemsOf(
      Array.from({ length: 12 }, (_, i) =>
        product(100 + i, `Refri ${i}`, 'Refrigerantes', null),
      ),
    );
    expect(searchMenu(many, 'refri')).toHaveLength(8);
    expect(searchMenu(MENU, '  ')).toEqual([]);
  });
});
