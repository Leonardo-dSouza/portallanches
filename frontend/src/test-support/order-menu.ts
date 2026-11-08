import type { OrderItem, OrderItemLine } from '../api/types';
import type { MenuItem } from '../cash/menu-lookup';

/** Itens do cardápio dos specs de linhas: X Salada aceita os Adicionais (categoria 3). */
export const X_SALADA: MenuItem = {
  id: 1,
  name: 'X Salada',
  menuNumber: 9,
  categoryId: 1,
  categoryName: 'Tradicional',
  addonCategoryId: 3,
  choiceCategoryId: null,
  sortOrder: 0,
  salePrice: '17.80',
  stockLeft: null,
  removables: [],
};

export const COCA: MenuItem = {
  id: 5,
  name: 'Coca Cola 600ml',
  menuNumber: null,
  categoryId: 4,
  categoryName: 'Refrigerantes',
  addonCategoryId: null,
  choiceCategoryId: null,
  sortOrder: 0,
  salePrice: '7.00',
  stockLeft: null,
  removables: [],
};

export const BACON: MenuItem = {
  id: 33,
  name: 'Add bacon',
  menuNumber: null,
  categoryId: 3,
  categoryName: 'Adicionais',
  addonCategoryId: null,
  choiceCategoryId: null,
  sortOrder: 0,
  salePrice: '6.00',
  stockLeft: null,
  removables: [],
};

/** Opção da categoria Pão (12, 2026-11-08): R$ 0, na ordem das teclas por `sortOrder`. */
const bread = (id: number, name: string, sortOrder: number): MenuItem => ({
  ...BACON,
  id,
  name,
  categoryId: 12,
  categoryName: 'Pão',
  salePrice: '0.00',
  sortOrder,
});

/** O pão do artesanal na ordem do usuário: Gergelim, Brioche, Tradicional. */
export const PAO_GERGELIM = bread(66, 'Pão Gergelim', 1);
export const PAO_BRIOCHE = bread(67, 'Pão Brioche', 2);
export const PAO_TRADICIONAL = bread(65, 'Pão Tradicional', 3);

/** X Salada artesanal (9.): aceita os Adicionais e exige o pão (categoria 12). */
export const X_SALADA_ART: MenuItem = {
  ...X_SALADA,
  id: 2,
  categoryId: 2,
  categoryName: 'Artesanal',
  choiceCategoryId: 12,
  salePrice: '33.80',
};

/** Cardápio do dia com o artesanal e os pães (fora de ordem, como pode vir da API). */
export const BREAD_MENU: MenuItem[] = [
  X_SALADA,
  X_SALADA_ART,
  COCA,
  BACON,
  PAO_TRADICIONAL,
  PAO_BRIOCHE,
  PAO_GERGELIM,
];

export const OVO: MenuItem = {
  ...BACON,
  id: 34,
  name: 'Add ovo',
  salePrice: '2.50',
};

/** Linha gravada como a API devolve (sem custo); lanche tem número no cardápio. */
export function storedLine(
  productName: string,
  categoryName: string,
  quantity: number,
  unitPrice = '1.00',
  menuNumber: number | null = null,
): OrderItemLine {
  return {
    productId: 1,
    productName,
    menuNumber,
    categoryName,
    quantity,
    unitPrice,
  };
}

/** Item gravado com observação e adicionais (quantidade total de cada adicional). */
export function storedItem(
  line: OrderItemLine,
  addons: OrderItemLine[] = [],
  note: string | null = null,
): OrderItem {
  return { ...line, note, choice: null, addons, removals: [] };
}
