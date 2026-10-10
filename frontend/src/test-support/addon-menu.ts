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

/**
 * Caixa com adicionais configurados: Tradicional e Artesanal aceitam os Adicionais; as bebidas
 * (categoria 4) não aceitam.
 */
export function apiWithAddons(): FakeApiClient {
  const api = new FakeApiClient();
  api.productCategories = [
    category(1, 'Tradicional', 3),
    category(3, 'Adicionais', null),
    category(4, 'Refrigerantes', null),
  ];
  api.products = [
    ...MENU.map((p) =>
      p.categoryName === 'Refrigerantes' ? { ...p, categoryId: 4 } : p,
    ),
    addon(33, 'Add bacon', '6.00'),
    addon(34, 'Add ovo', '2.50'),
  ];
  return api;
}
