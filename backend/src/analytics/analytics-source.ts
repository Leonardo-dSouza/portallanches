import type { ClosingOrderRow } from '../report/period-report-source.js';

export const ANALYTICS_SOURCE = Symbol('ANALYTICS_SOURCE');

/** Linha vendida com nome, categoria e preço copiados no pedido (os da época da venda). */
export interface AnalyticsItemRow {
  productId: number;
  productName: string;
  /** Número no cardápio da época: só lanches têm (bebidas, açaí e adicionais, não). */
  menuNumber: number | null;
  categoryName: string;
  quantity: number;
  unitPrice: string;
}

/** Pedido com o que a análise precisa além dos totais: bairro, cliente e itens. */
export interface AnalyticsOrderRow extends ClosingOrderRow {
  /** Bairro da entrega; null no balcão e nos importados. */
  neighborhood: string | null;
  customerId: number | null;
  customerName: string | null;
  /** Vazio nos pedidos importados da planilha histórica (só tinham o valor). */
  items: AnalyticsItemRow[];
}

/** Categoria do cadastro e a posição dela no cardápio (a ordem das vendas por categoria). */
export interface CategoryOrderRow {
  name: string;
  sortOrder: number;
}

/** Leituras da análise; implementado sobre o Prisma. */
export interface AnalyticsSource {
  listOrders(closingIds: number[]): Promise<AnalyticsOrderRow[]>;
  listCategoryOrder(): Promise<CategoryOrderRow[]>;
}
