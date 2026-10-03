export type UserRole = 'CAIXA' | 'ADMIN';

export interface SessionUser {
  id: number;
  name: string;
  role: UserRole;
}

export interface LoginResult {
  token: string;
  user: SessionUser;
}

export type OrderType = 'DELIVERY' | 'COUNTER';
export type ClosingStatus = 'OPEN' | 'CLOSED';

/** Dinheiro sempre como texto com 2 casas (`"25.50"`), igual ao backend: nunca somado no cliente. */
export type Money = string;

export interface PaymentMethod {
  id: number;
  name: string;
  active: boolean;
  sortOrder: number;
}

export interface DeliveryZone {
  id: number;
  neighborhood: string;
  neighborhoodKey: string;
  fee: Money;
  active: boolean;
}

export interface ExpenseType {
  id: number;
  name: string;
  nameKey: string;
  active: boolean;
}

export interface Order {
  id: number;
  amount: Money;
  /** Nulos só em pedidos importados da planilha histórica (sem essa informação). */
  type: OrderType | null;
  paymentMethodId: number | null;
  deliveryZoneId: number | null;
  deliveryFee: Money | null;
  /** Cópia do cliente no lançamento (só em entregas); não muda se o cadastro mudar. */
  customerId: number | null;
  customerName: string | null;
  customerPhone: string | null;
  customerStreet: string | null;
}

export interface OrderInput {
  amount: Money;
  type: OrderType;
  paymentMethodId: number;
  /** Obrigatório na entrega: o bairro e a taxa padrão vêm do cadastro do cliente. */
  customerId?: number;
  deliveryFee?: Money;
}

export interface CustomerInput {
  name: string;
  /** Só dígitos; null quando o pedido não trouxe telefone. */
  phone: string | null;
  street: string;
  deliveryZoneId: number;
}

export interface Customer extends CustomerInput {
  id: number;
}

export interface Expense {
  id: number;
  expenseTypeId: number;
  description: string | null;
  amount: Money;
}

export interface ExpenseInput {
  expenseTypeId: number;
  description?: string;
  amount: Money;
}

export interface Closing {
  id: number;
  businessDate: string;
  status: ClosingStatus;
}

export interface PaymentMethodTotal {
  paymentMethodId: number;
  name: string;
  ordersCount: number;
  total: Money;
}

export interface ClosingReport {
  businessDate: string;
  status: ClosingStatus;
  orders: { count: number; total: Money };
  byPaymentMethod: PaymentMethodTotal[];
  withoutPaymentMethod: { count: number; total: Money };
  delivery: { count: number; feesTotal: Money };
  motoboy: { dailyRate: Money; deliveryFees: Money; totalCost: Money };
  expenses: { count: number; total: Money };
}

/** Intervalo inclusivo de datas `YYYY-MM-DD` (data local, sem fuso). */
export interface DateRange {
  from: string;
  to: string;
}

/** Totais do período: espelha `PeriodTotals` do backend (`dailyRates` = soma das diárias). */
export interface PeriodTotals {
  orders: ClosingReport['orders'];
  byPaymentMethod: PaymentMethodTotal[];
  withoutPaymentMethod: ClosingReport['withoutPaymentMethod'];
  delivery: ClosingReport['delivery'];
  motoboy: { dailyRates: Money; deliveryFees: Money; totalCost: Money };
  expenses: ClosingReport['expenses'];
}

/** Um relatório por dia com fechamento (ordem crescente) e o total do período. */
export interface PeriodReport extends DateRange {
  days: ClosingReport[];
  totals: PeriodTotals;
}

export type DayGroup = 'TUE_THU' | 'FRI_SUN';

/** Uma linha do histórico da diária: vale a partir de `effectiveFrom` até a próxima linha do mesmo grupo. */
export interface MotoboyRate {
  id: number;
  dayGroup: DayGroup;
  amount: Money;
  effectiveFrom: string;
  createdById: number;
}

/** Embalagem de compra: `quantity` unidades de contagem do insumo (ex.: fardo = 6). */
export interface SupplyPackage {
  name: string;
  /** Quantidade no formato da API, com ponto e até 3 casas (`'6'`, `'2.5'`). */
  quantity: string;
}

/** Seção do estoque (Geladeira, Armário...), na ordem da prateleira. */
export interface SupplySection {
  id: number;
  name: string;
  sortOrder: number;
  active: boolean;
}

export interface SupplyInput {
  name: string;
  countUnit: string;
  /** Estoque mínimo na unidade de contagem; null = sem alerta de baixa. */
  minStock: string | null;
  /** Custo em R$ por unidade de contagem, até 4 casas (`'39.9'`, `'0.0833'`); null = sem custo. */
  unitCost: string | null;
  /** A venda de lanche desconta este insumo do estoque (Entregável 3). */
  deductOnSale: boolean;
  /** "Contar todo dia": entra na Contagem do dia e a Situação avisa enquanto faltar. */
  dailyCount: boolean;
  /** null = "Sem seção". */
  sectionId: number | null;
  active: boolean;
  packages: SupplyPackage[];
  /**
   * Preço de venda gravado no produto 1:1 do Cardápio (`Supply.saleProduct`).
   * Ausente = não mexe no preço; null = tira o preço.
   */
  salePrice?: string | null;
}

/** Produto do Cardápio que é o próprio insumo vendido (bebida, adicional de 1 un). */
export interface SaleProduct {
  id: number;
  name: string;
  /** Com 2 casas; null = sem preço. */
  salePrice: string | null;
  /** Planilha de origem ('bebidas', 'cardapio'); a reimportação sobrescreve o preço. */
  importSource: string | null;
}

export interface Supply extends Omit<SupplyInput, 'salePrice'> {
  id: number;
  saleProduct: SaleProduct | null;
}

export type StockCountStatus = 'COUNTED' | 'NOT_COUNTED' | 'NEEDS_PURCHASE';

export interface StockLastCount {
  status: StockCountStatus;
  quantity: string | null;
  /** Instante ISO. */
  countedAt: string;
}

/** Situação de um insumo ativo; alertas calculados no servidor na data de negócio. */
export interface StockItem {
  supplyId: number;
  name: string;
  sectionId: number | null;
  countUnit: string;
  minStock: string | null;
  dailyCount: boolean;
  quantity: string;
  lots: { id: number; remaining: string; expiresOn: string | null }[];
  nextExpiry: string | null;
  lastCount: StockLastCount | null;
  flags: {
    expired: boolean;
    expiringSoon: boolean;
    belowMin: boolean;
    needsPurchase: boolean;
    /** Diário sem contagem hoje (o "Não contado" não conta como contagem). */
    countDue: boolean;
  };
}

/** Valor pago pela linha inteira ou por unidade digitada (por fardo, por kg). */
export type PaidPer = 'total' | 'unit';

export interface StockEntryInput {
  supplyId: number;
  amount: string;
  /** null = quantidade já na unidade de contagem. */
  packageName: string | null;
  expiresOn: string | null;
  /** R$ pagos no formato da API; null = não informado (o custo do insumo não muda). */
  paid: string | null;
  paidPer: PaidPer;
}

/** Entrada já lançada, para o histórico da aba Entrada. */
export interface StockEntryRecord {
  lotId: number;
  supplyId: number;
  supplyName: string;
  countUnit: string;
  quantity: string;
  remaining: string;
  expiresOn: string | null;
  /** R$ por unidade de contagem, até 4 casas; null = não informado. */
  unitCost: string | null;
  createdByName: string;
  /** Instantes ISO. */
  createdAt: string;
  reversedAt: string | null;
  /** Ainda pode ser desfeita (nada mexeu no lote depois). */
  reversible: boolean;
}

export interface StockCountItem {
  supplyId: number;
  status: StockCountStatus;
  quantity?: string;
}

export interface ProductCategory {
  id: number;
  name: string;
  sortOrder: number;
  active: boolean;
}

/** Linha da composição como a API grava: insumo e quantidade na unidade de contagem dele. */
export interface ProductComponentInput {
  supplyId: number;
  /** Formato da API, com ponto e até 3 casas (`'0.036'`). */
  quantity: string;
}

export interface ProductInput {
  categoryId: number;
  /** Número do cardápio impresso (9 = X Salada); tradicional e artesanal dividem. */
  menuNumber: number | null;
  name: string;
  description: string | null;
  /** Preço de venda com 2 casas (`'17.80'`); null = ainda sem preço. */
  salePrice: string | null;
  active: boolean;
  components: ProductComponentInput[];
}

/** Composição lida: vem com o nome, a unidade e o custo atual do insumo. */
export interface ProductComponent extends ProductComponentInput {
  supplyName: string;
  countUnit: string;
  unitCost: string | null;
}

/** Produto do cardápio; CMV calculado no servidor com o custo atual dos insumos. */
export interface Product extends Omit<ProductInput, 'components'> {
  id: number;
  categoryName: string;
  components: ProductComponent[];
  /** Reais com 2 casas. */
  cmv: string;
  /** False se algum insumo não tem custo (CMV abaixo do real). */
  cmvComplete: boolean;
  /** CMV ÷ preço em %, 1 casa (`'41.7'`); null sem preço. */
  cmvPercent: string | null;
}
