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
  salePrice: '6.00',
  stockLeft: null,
  removables: [],
};

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
  return { ...line, note, addons, removals: [] };
}
