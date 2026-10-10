import { findByNumber, searchMenu, type MenuItem } from './menu-lookup';

const item = (
  id: number,
  name: string,
  categoryName: string,
  menuNumber: number | null,
  salePrice = '10.00',
): MenuItem => ({
  id,
  name,
  categoryName,
  menuNumber,
  salePrice,
  stockLeft: null,
});

// O filtro de ativo e com preço é da API (`GET /products/for-sale`, sale-menu.ts no backend).
const MENU = [
  item(1, 'X Salada', 'Tradicional', 9, '17.80'),
  item(2, 'X Salada', 'Artesanal', 9, '25.90'),
  item(3, 'X Burguer Duplo', 'Artesanal', 27),
  item(4, 'Hot Dog', 'Tradicional', 1),
  item(5, 'Coca Cola 600ml', 'Refrigerantes', null, '7.00'),
  item(6, 'Coca Cola 2l', 'Refrigerantes', null),
  item(7, 'Açaí 500ml', 'Açaí', null, '12.50'),
  item(8, 'X Bacon Salada', 'Tradicional', 10),
];

describe('findByNumber', () => {
  it('sem ponto é o tradicional; com ponto, o artesanal', () => {
    expect(findByNumber(MENU, 9, false)?.id).toBe(1);
    expect(findByNumber(MENU, 9, true)?.id).toBe(2);
  });

  it('número que só existe numa categoria vale com ou sem ponto', () => {
    expect(findByNumber(MENU, 27, false)?.id).toBe(3);
    expect(findByNumber(MENU, 1, true)?.id).toBe(4);
  });

  it('número fora do cardápio não acha nada', () => {
    expect(findByNumber(MENU, 99, false)).toBeNull();
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
    const many = Array.from({ length: 12 }, (_, i) =>
      item(100 + i, `Refri ${i}`, 'Refrigerantes', null),
    );
    expect(searchMenu(many, 'refri')).toHaveLength(8);
    expect(searchMenu(MENU, '  ')).toEqual([]);
  });
});
