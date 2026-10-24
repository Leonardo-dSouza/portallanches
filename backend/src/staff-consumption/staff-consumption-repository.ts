import type { OrderEntry } from '../orders/order-pricing.js';
import type { StockChange } from '../orders/order-repository.js';
import type { SaleShortfall } from '../orders/order-stock.js';

export const STAFF_CONSUMPTION_REPOSITORY = Symbol(
  'STAFF_CONSUMPTION_REPOSITORY',
);

/** Consumo pronto para gravar: quem consumiu e os itens com preço e CMV da época. */
export interface StaffConsumptionData {
  consumerName: string;
  /** Nome normalizado (minúsculas, sem acento): sugestões e agrupamento na Análise. */
  consumerKey: string;
  items: OrderEntry[];
}

export interface StaffConsumptionRecord extends StaffConsumptionData {
  id: number;
  closingId: number;
  createdById: number;
  createdAt: Date;
}

/** Consumo recém-gravado, com o que o saldo do sistema não cobriu (avisa e deixa salvar). */
export interface SavedStaffConsumption extends StaffConsumptionRecord {
  stockShortfalls: SaleShortfall[];
}

/**
 * Consumo interno do dia. A baixa no estoque vai na mesma transação; `stock` null = não mexe no
 * estoque (dia passado, como o caixa atrasado do pedido).
 */
export interface StaffConsumptionRepository {
  create(
    closingId: number,
    createdById: number,
    data: StaffConsumptionData,
    stock: StockChange | null,
  ): Promise<SavedStaffConsumption>;
  findById(id: number): Promise<StaffConsumptionRecord | null>;
  update(
    id: number,
    data: StaffConsumptionData,
    stock: StockChange | null,
  ): Promise<SavedStaffConsumption>;
  /** Com `stock`, devolve ao estoque o que o consumo tinha baixado antes de apagar. */
  delete(id: number, stock: StockChange | null): Promise<void>;
  listByClosing(closingId: number): Promise<StaffConsumptionRecord[]>;
  /** Nomes usados desde `since`, o mais recente primeiro, um por chave, até `limit`. */
  recentNames(since: Date, limit: number): Promise<string[]>;
}
