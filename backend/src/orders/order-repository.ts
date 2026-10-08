import type { OrderType, PaymentMode } from './order-input.js';
import type { OrderLine, SaleProduct } from './order-pricing.js';

export const ORDER_REPOSITORY = Symbol('ORDER_REPOSITORY');
export const ORDER_CATALOG = Symbol('ORDER_CATALOG');

/** Dados do cliente copiados no pedido; todos nulos no balcão. */
export interface OrderCustomerSnapshot {
  customerId: number | null;
  customerName: string | null;
  customerPhone: string | null;
  customerStreet: string | null;
}

/** Pedido pronto para gravar: taxa já resolvida e sempre presente; `amount` = itens + taxa. */
export interface OrderData extends OrderCustomerSnapshot {
  amount: string;
  /** Vazio só nos pedidos importados da planilha histórica (só tinham o valor). */
  items: OrderLine[];
  type: OrderType;
  paymentMethodId: number;
  paymentMode: PaymentMode | null;
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

export interface PaymentMethodEntry extends CatalogEntry {
  isCardTerminal: boolean;
}

export interface DeliveryZoneEntry extends CatalogEntry {
  fee: string;
}

export interface CustomerEntry {
  id: number;
  name: string;
  phone: string | null;
  street: string;
  deliveryZoneId: number;
}

/** Cadastros que um pedido referencia (formas de pagamento, bairros, clientes e cardápio). */
export interface OrderCatalog {
  findPaymentMethod(id: number): Promise<PaymentMethodEntry | null>;
  findDeliveryZone(id: number): Promise<DeliveryZoneEntry | null>;
  findCustomer(id: number): Promise<CustomerEntry | null>;
  /** Itens do cardápio com preço e composição; ids inexistentes simplesmente não voltam. */
  findProductsForSale(ids: number[]): Promise<SaleProduct[]>;
}
