import type { Product, ProductCategory } from '../api/types';
import { FakeApiClient } from './fake-api-client';
import { MENU } from './render-cashier';

const category = (
  id: number,
  name: string,
  addonCategoryId: number | null,
): ProductCategory => ({
  id,
  name,
  sortOrder: id,
  active: true,
  importLocked: true,
  addonCategoryId,
});

/** "Add bacon" (33) e "Add ovo" (34), da categoria Adicionais (3). */
const addon = (id: number, name: string, salePrice: string): Product => ({
  ...MENU[0],
  id,
  name,
  categoryId: 3,
  categoryName: 'Adicionais',
  menuNumber: null,
  salePrice,
});

const ingredient = (supplyId: number, supplyName: string) => ({
  supplyId,
  supplyName,
  quantity: '1',
  countUnit: 'un',
  unitCost: '1.00',
});

/** Alface (1), Tomate (2) e Ovo (3): o que dá para tirar do X Salada tradicional. */
const INGREDIENTS = [
  ingredient(1, 'Alface'),
  ingredient(2, 'Tomate'),
  ingredient(3, 'Ovo'),
];

/**
 * Caixa com adicionais configurados: Tradicional e Artesanal aceitam os Adicionais; as bebidas
 * (categoria 4) não aceitam. O X Salada tradicional tem ingredientes para retirar.
 */
export function apiWithAddons(): FakeApiClient {
  const api = new FakeApiClient();
  api.productCategories = [
    category(1, 'Tradicional', 3),
    category(3, 'Adicionais', null),
    category(4, 'Refrigerantes', null),
  ];
  api.products = [
    ...MENU.map((p) => {
      if (p.id === 1) return { ...p, components: INGREDIENTS };
      return p.categoryName === 'Refrigerantes' ? { ...p, categoryId: 4 } : p;
    }),
    addon(33, 'Add bacon', '6.00'),
    addon(34, 'Add ovo', '2.50'),
  ];
  return api;
}
