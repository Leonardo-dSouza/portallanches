import type { DatedMenuEntry } from './sale-menu.js';
import type {
  BundleFacts,
  BundleItemRecord,
  ProductComponentRecord,
  ProductData,
  ProductRecord,
  ProductRepository,
} from './product-repository.js';
import type {
  AppSettings,
  SettingsReader,
} from '../settings/app-settings.service.js';
import { ProductService } from './product.service.js';

// Apoio dos specs do ProductService (cadastro e combos), separados por tamanho.

interface FakeSupply {
  id: number;
  name: string;
  countUnit: string;
  unitCost: string | null;
}

export const SUPPLIES: FakeSupply[] = [
  { id: 4, name: 'Queijo bandeja', countUnit: 'kg', unitCost: '39.9' },
  { id: 7, name: 'Hambúrguer 56g', countUnit: 'un', unitCost: '2.35' },
  { id: 9, name: 'Tomate', countUnit: 'kg', unitCost: null },
];

/** Só a categoria 1 (Tradicional) existe. */
const CATEGORY_IDS = [1];

/** Repositório em memória que junta os dados do insumo como o Prisma faria. */
export class FakeProductRepository implements ProductRepository {
  readonly saved: ProductData[] = [];
  /** Dia de negócio recebido em cada `update`, para o histórico de preços. */
  readonly updatedOn: string[] = [];
  records: ProductRecord[] = [];

  async list(): Promise<ProductRecord[]> {
    return this.records;
  }

  /** Dias pedidos ao cardápio do caixa e o que ele devolve. */
  readonly menuDates: string[] = [];
  datedMenu: DatedMenuEntry[] = [];

  async listDatedMenu(businessDate: string): Promise<DatedMenuEntry[]> {
    this.menuDates.push(businessDate);
    return this.datedMenu;
  }

  /** Saldo por insumo em milésimos, como a soma dos lotes. */
  balances = new Map<number, number>();

  async stockBalances(supplyIds: number[]): Promise<Map<number, number>> {
    const asked = [...this.balances].filter(([id]) => supplyIds.includes(id));
    return new Map(asked);
  }

  async exists(id: number): Promise<boolean> {
    return this.records.some((r) => r.id === id);
  }

  async categoryExists(categoryId: number): Promise<boolean> {
    return CATEGORY_IDS.includes(categoryId);
  }

  async missingSupplyIds(supplyIds: number[]): Promise<number[]> {
    return supplyIds.filter((id) => !SUPPLIES.some((s) => s.id === id));
  }

  async create(data: ProductData): Promise<ProductRecord> {
    return this.store(this.records.length + 1, data);
  }

  async update(
    id: number,
    data: ProductData,
    today: string,
  ): Promise<ProductRecord> {
    this.updatedOn.push(today);
    this.records = this.records.filter((r) => r.id !== id);
    return this.store(id, data);
  }

  /** Como o Prisma: o que cada id pedido para o combo é (inexistente, combo, item de combo). */
  async bundleFacts(
    productId: number | null,
    itemIds: number[],
  ): Promise<BundleFacts> {
    const find = (id: number) => this.records.find((r) => r.id === id);
    return {
      missing: itemIds.filter((id) => !find(id)),
      combos: itemIds.filter((id) => (find(id)?.bundleItems.length ?? 0) > 0),
      usedInCombo: this.records.some((r) =>
        r.bundleItems.some((item) => item.productId === productId),
      ),
    };
  }

  private store(id: number, data: ProductData): ProductRecord {
    this.saved.push(data);
    const { nameKey: _key, components, bundleItems, ...fields } = data;
    const record = {
      id,
      ...fields,
      categoryName: 'Tradicional',
      components: components.map(joinSupply),
      bundleItems: bundleItems.map((item) => this.joinItem(item)),
    };
    this.records.push(record);
    return record;
  }

  private joinItem(item: {
    productId: number;
    quantity: number;
  }): BundleItemRecord {
    const product = this.records.find((r) => r.id === item.productId)!;
    return {
      productId: product.id,
      productName: product.name,
      quantity: item.quantity,
      components: product.components,
    };
  }
}

function joinSupply(component: {
  supplyId: number;
  quantity: string;
}): ProductComponentRecord {
  const supply = SUPPLIES.find((s) => s.id === component.supplyId)!;
  return {
    supplyId: supply.id,
    supplyName: supply.name,
    countUnit: supply.countUnit,
    unitCost: supply.unitCost,
    quantity: component.quantity,
  };
}

export const X_SALADA = {
  categoryId: 1,
  name: 'X Salada',
  salePrice: '10.00',
  components: [
    { supplyId: 4, quantity: '0.036' },
    { supplyId: 7, quantity: 1 },
  ],
};

/** 23h de 09/10 em Brasília: em UTC já é dia 10. */
const LATE_NIGHT = new Date('2026-10-10T02:00:00Z');

/** Configuração fixa: o caixa mostra o saldo abaixo de 6 (o padrão). */
export class FixedSettings implements SettingsReader {
  lowStockWarning = 6;

  async read(): Promise<AppSettings> {
    return { lowStockWarning: this.lowStockWarning };
  }
}

export function build() {
  const products = new FakeProductRepository();
  const settings = new FixedSettings();
  const service = new ProductService(
    products,
    () => LATE_NIGHT,
    'America/Sao_Paulo',
    settings,
  );
  return { service, products, settings };
}
