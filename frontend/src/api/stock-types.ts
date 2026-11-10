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
}

/** Insumo lido; o custo só vem para o admin (2026-10-25), o caixa recebe sem o campo. */
export interface Supply extends Omit<SupplyInput, 'salePrice' | 'unitCost'> {
  id: number;
  saleProduct: SaleProduct | null;
  unitCost?: string | null;
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
  /** Baixa sozinho na venda: deductOnSale ativo e compõe algum produto ativo. */
  soldInMenu: boolean;
  quantity: string;
  lots: { id: number; remaining: string; expiresOn: string | null }[];
  nextExpiry: string | null;
  lastCount: StockLastCount | null;
  /** Vendido além do saldo do sistema, ainda sem entrada ou contagem; null = nada. */
  oversold: string | null;
  flags: {
    expired: boolean;
    expiringSoon: boolean;
    belowMin: boolean;
    needsPurchase: boolean;
    /** Diário sem contagem hoje (o "Não contado" não conta como contagem). */
    countDue: boolean;
    /** "Conferir": vendeu além do saldo (a próxima entrada desconta). */
    oversold: boolean;
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
  /** R$ por unidade de contagem, até 4 casas; null = não informado; ausente para o caixa. */
  unitCost?: string | null;
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
