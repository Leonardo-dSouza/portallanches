import type { OrderType } from './order-input.js';

export const ORDER_REPOSITORY = Symbol('ORDER_REPOSITORY');
export const ORDER_CATALOG = Symbol('ORDER_CATALOG');

/** Pedido pronto para gravar: taxa já resolvida e sempre presente. */
export interface OrderData {
  amount: string;
  type: OrderType;
  paymentMethodId: number;
  deliveryZoneId: number | null;
  deliveryFee: string;
}

/**
 * Pedido lido do banco. `type`, `paymentMethodId` e `deliveryFee` são nulos apenas em
 * pedidos importados da planilha histórica, que não guardava essa informação.
 */
export interface OrderRecord extends Omit<
  OrderData,
  'type' | 'paymentMethodId' | 'deliveryFee'
> {
  type: OrderType | null;
  paymentMethodId: number | null;
  deliveryFee: string | null;
  id: number;
  closingId: number;
  createdById: number;
}

export interface OrderRepository {
  create(
    closingId: number,
    createdById: number,
    data: OrderData,
  ): Promise<OrderRecord>;
  findById(id: number): Promise<OrderRecord | null>;
  update(id: number, data: OrderData): Promise<OrderRecord>;
  delete(id: number): Promise<void>;
  listByClosing(closingId: number): Promise<OrderRecord[]>;
}

export interface CatalogEntry {
  id: number;
  active: boolean;
}

export interface DeliveryZoneEntry extends CatalogEntry {
  fee: string;
}

/** Cadastros que um pedido referencia (formas de pagamento e bairros). */
export interface OrderCatalog {
  findPaymentMethod(id: number): Promise<CatalogEntry | null>;
  findDeliveryZone(id: number): Promise<DeliveryZoneEntry | null>;
}
