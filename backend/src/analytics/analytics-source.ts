import type { ClosingOrderRow } from '../report/period-report-source.js';

export const ANALYTICS_SOURCE = Symbol('ANALYTICS_SOURCE');

/** Linha vendida com nome, categoria e preço copiados no pedido (os da época da venda). */
export interface AnalyticsItemRow {
  productId: number;
  productName: string;
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

/** Lanche ativo do cardápio (os que têm número): base dos "menos vendidos", inclusive os zerados. */
export interface MenuLancheRow {
  id: number;
  name: string;
  menuNumber: number;
  categoryName: string;
}

/** Leituras da análise; implementado sobre o Prisma. */
export interface AnalyticsSource {
  listOrders(closingIds: number[]): Promise<AnalyticsOrderRow[]>;
  listMenuLanches(): Promise<MenuLancheRow[]>;
}
