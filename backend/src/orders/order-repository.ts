import type { OrderType, PaymentMode } from './order-input.js';
import type { OrderEntry, SaleProduct } from './order-pricing.js';
import type { OrderStatus } from './order-status.js';
import type { SaleShortfall } from './order-stock.js';
import type { SaleNeed } from './stock-needs.js';

export const ORDER_REPOSITORY = Symbol('ORDER_REPOSITORY');
export const ORDER_CATALOG = Symbol('ORDER_CATALOG');

/** Dados do cliente copiados no pedido; todos nulos no balcão. */
export interface OrderCustomerSnapshot {
  customerId: number | null;
  customerName: string | null;
  customerPhone: string | null;
  customerStreet: string | null;
  customerNumber: string | null;
  customerReference: string | null;
}

/** Pedido pronto para gravar: taxa já resolvida e sempre presente; `amount` = itens + taxa. */
export interface OrderData extends OrderCustomerSnapshot {
  amount: string;
  /**
   * Itens com observação e adicionais (árvore). Vazio só nos pedidos importados da planilha
   * histórica (só tinham o valor).
   */
  items: OrderEntry[];
  type: OrderType;
  paymentMethodId: number;
  paymentMode: PaymentMode | null;
  deliveryZoneId: number | null;
  deliveryFee: string;
  /** Andamento: o service decide (inicial pela noite em andamento; na edição, mantém). */
  status: OrderStatus;
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
  /** Número no dia (#1, #2…), dado pelo repositório ao criar e nunca mudado. */
  dayNumber: number;
  createdById: number;
  createdAt: Date;
}

/**
 * Baixa do pedido no estoque, gravada junto com ele: quem lançou e o que sai (vazio = só
 * devolve o que ele tinha baixado). Null = o pedido não mexe no estoque (caixa atrasado).
 */
export interface StockChange {
  userId: number;
  needs: SaleNeed[];
}

/**
 * Pedido recém-gravado: com o que o saldo do sistema não cobriu (o caixa avisa, mas a venda
 * sai; decisão do usuário, 2026-10-09). Vazio = cobriu tudo ou o pedido não mexe no estoque.
 */
export interface SavedOrder extends OrderRecord {
  stockShortfalls: SaleShortfall[];
}

/**
 * Resposta de criar ou editar: o pedido e se o dia dele é a noite em andamento (só nela o
 * caixa imprime a comanda; ver `isLiveNight`).
 */
export interface OrderSaveResponse extends SavedOrder {
  live: boolean;
}

export interface OrderRepository {
  create(
    closingId: number,
    createdById: number,
    data: OrderData,
    stock: StockChange | null,
  ): Promise<SavedOrder>;
  findById(id: number): Promise<OrderRecord | null>;
  /** Com `stock`, devolve a baixa anterior do pedido e grava a nova na mesma transação. */
  update(
    id: number,
    data: OrderData,
    stock: StockChange | null,
  ): Promise<SavedOrder>;
  /** Com `stock`, devolve ao estoque o que o pedido tinha baixado antes de apagá-lo. */
  delete(id: number, stock: StockChange | null): Promise<void>;
  updateStatus(id: number, status: OrderStatus): Promise<OrderRecord>;
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
  number: string | null;
  reference: string | null;
  deliveryZoneId: number;
}

/** Cadastros que um pedido referencia (formas de pagamento, bairros, clientes e cardápio). */
export interface OrderCatalog {
  findPaymentMethod(id: number): Promise<PaymentMethodEntry | null>;
  findDeliveryZone(id: number): Promise<DeliveryZoneEntry | null>;
  findCustomer(id: number): Promise<CustomerEntry | null>;
  /**
   * Itens do cardápio com composição, com o preço e a situação do dia de negócio do pedido
   * (caixa atrasado usa o preço da época); ids inexistentes simplesmente não voltam.
   */
  findProductsForSale(
    ids: number[],
    businessDate: string,
  ): Promise<SaleProduct[]>;
}
