import type { OrderItemInput } from './order-item-input.js';
import type { SaleProduct } from './order-pricing.js';

/** Produto que não está no cardápio vai para o fim; o preço recusa o id logo depois. */
const UNKNOWN_POSITION = Number.MAX_SAFE_INTEGER;

/**
 * Itens do pedido na ordem da aba Categorias (pedido do usuário, 2026-10-10: lanches, depois
 * açaí, depois bebidas, para a comanda sair sempre igual). Dentro da categoria fica a ordem
 * digitada; categorias com a mesma posição não se misturam (desempate pelo id).
 *
 * @example sortItemsByCategory([coca, xSalada], productsById).map((i) => i.productId) // [9, 60]
 */
export function sortItemsByCategory(
  items: OrderItemInput[],
  products: Map<number, SaleProduct>,
): OrderItemInput[] {
  const position = (item: OrderItemInput): [number, number] => {
    const product = products.get(item.productId);
    if (!product) return [UNKNOWN_POSITION, UNKNOWN_POSITION];
    return [product.categorySortOrder, product.categoryId];
  };
  // O sort do JavaScript é estável: empate mantém a ordem digitada.
  return [...items].sort((a, b) => {
    const [orderA, idA] = position(a);
    const [orderB, idB] = position(b);
    return orderA - orderB || idA - idB;
  });
}
