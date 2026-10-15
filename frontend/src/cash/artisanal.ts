/** Tradicional e artesanal repetem números e nomes do cardápio; a categoria desfaz a dúvida. */
const ARTISANAL_CATEGORY = 'Artesanal';

/**
 * Se o item é do cardápio artesanal (na busca, na comanda e no papel ele leva marca própria).
 *
 * @example isArtisanal('Artesanal') // true
 */
export function isArtisanal(categoryName: string): boolean {
  return categoryName === ARTISANAL_CATEGORY;
}
