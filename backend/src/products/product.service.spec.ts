import {
  BadRequestException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { DatedMenuEntry } from './sale-menu.js';
import type {
  ProductComponentRecord,
  ProductData,
  ProductRecord,
  ProductRepository,
} from './product-repository.js';
import { ProductService } from './product.service.js';

interface FakeSupply {
  id: number;
  name: string;
  countUnit: string;
  unitCost: string | null;
}

const SUPPLIES: FakeSupply[] = [
  { id: 4, name: 'Queijo bandeja', countUnit: 'kg', unitCost: '39.9' },
  { id: 7, name: 'Hambúrguer 56g', countUnit: 'un', unitCost: '2.35' },
  { id: 9, name: 'Tomate', countUnit: 'kg', unitCost: null },
];

/** Só a categoria 1 (Tradicional) existe. */
const CATEGORY_IDS = [1];

/** Repositório em memória que junta os dados do insumo como o Prisma faria. */
class FakeProductRepository implements ProductRepository {
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

  private store(id: number, data: ProductData): ProductRecord {
    this.saved.push(data);
    const { nameKey: _key, components, ...fields } = data;
    const record = {
      id,
      ...fields,
      categoryName: 'Tradicional',
      components: components.map(joinSupply),
    };
    this.records.push(record);
    return record;
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

const X_SALADA = {
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

function build() {
  const products = new FakeProductRepository();
  const service = new ProductService(
    products,
    () => LATE_NIGHT,
    'America/Sao_Paulo',
  );
  return { service, products };
}

describe('ProductService', () => {
  it('grava com a chave do nome e devolve CMV e % do preço', async () => {
    const { service, products } = build();
    const created = await service.create({ ...X_SALADA, name: 'X Salada Ó' });
    expect(products.saved[0].nameKey).toBe('x salada o');
    // 0,036 × 39,90 + 1 × 2,35 = 3,7864 → 3,79
    expect(created).toMatchObject({
      cmv: '3.79',
      cmvComplete: true,
      cmvPercent: '37.9',
    });
  });

  it('insumo sem custo deixa o CMV incompleto; sem preço não há %', async () => {
    const { service } = build();
    const created = await service.create({
      ...X_SALADA,
      salePrice: null,
      components: [...X_SALADA.components, { supplyId: 9, quantity: '0.03' }],
    });
    expect(created).toMatchObject({
      cmv: '3.79',
      cmvComplete: false,
      cmvPercent: null,
    });
  });

  it('atualiza trocando a composição e lista com o CMV calculado', async () => {
    const { service } = build();
    const created = await service.create(X_SALADA);
    await service.update(created.id, {
      ...X_SALADA,
      components: [{ supplyId: 7, quantity: 2 }],
    });
    const [listed] = await service.list();
    expect(listed).toMatchObject({
      cmv: '4.70',
      components: [{ quantity: '2' }],
    });
  });

  it('a edição grava com o dia de negócio da lanchonete, não o do UTC', async () => {
    const { service, products } = build();
    const created = await service.create(X_SALADA);
    await service.update(created.id, { ...X_SALADA, salePrice: '19.90' });
    expect(products.updatedOn).toEqual(['2026-10-09']);
  });

  it('cardápio do caixa sem data usa o dia de negócio de hoje', async () => {
    const { service, products } = build();
    await service.listForSale();
    expect(products.menuDates).toEqual(['2026-10-09']);
  });

  it('cardápio do caixa num dia passado traz o preço da época', async () => {
    const { service, products } = build();
    products.datedMenu = [
      {
        id: 9,
        name: 'X Salada',
        menuNumber: 9,
        categoryName: 'Tradicional',
        salePrice: '19.90',
        active: true,
        deactivatedOn: null,
        supersededPrice: '17.80',
      },
    ];
    const menu = await service.listForSale('2026-10-05');
    expect(products.menuDates).toEqual(['2026-10-05']);
    expect(menu.map((item) => item.salePrice)).toEqual(['17.80']);
  });

  it('cardápio do caixa com data inválida → 400', async () => {
    await expect(build().service.listForSale('abc')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('categoria inexistente → 422', async () => {
    const { service } = build();
    await expect(
      service.create({ ...X_SALADA, categoryId: 99 }),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it('insumo inexistente → 422 citando os ids', async () => {
    const { service } = build();
    await expect(
      service.create({
        ...X_SALADA,
        components: [
          { supplyId: 50, quantity: 1 },
          { supplyId: 51, quantity: 1 },
        ],
      }),
    ).rejects.toThrow(/Insumos inexistentes na composição: 50, 51/);
  });

  it('produto inexistente no PUT → 404', async () => {
    const { service } = build();
    await expect(service.update(99, X_SALADA)).rejects.toThrow(
      NotFoundException,
    );
  });
});
