import {
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type {
  SupplyData,
  SupplyRecord,
  SupplyRepository,
  SupplySectionRecord,
} from './supply-repository.js';
import type { SaleProductRecord } from './sale-product.js';
import { SupplyService } from './supply.service.js';

class FakeSupplyRepository implements SupplyRepository {
  readonly saved: SupplyData[] = [];
  records: SupplyRecord[] = [];
  /** Produto 1:1 por id de insumo (bebidas). */
  saleProducts = new Map<number, SaleProductRecord>();
  savedPrices: { id: number; salePrice: string | null; today: string }[] = [];

  async findSaleProduct(id: number): Promise<SaleProductRecord | null> {
    return this.saleProducts.get(id) ?? null;
  }
  sections: SupplySectionRecord[] = [
    { id: 1, name: 'Geladeira', sortOrder: 1, active: true },
  ];

  async listSections(): Promise<SupplySectionRecord[]> {
    return this.sections;
  }

  async sectionExists(sectionId: number): Promise<boolean> {
    return this.sections.some((section) => section.id === sectionId);
  }

  async list(): Promise<SupplyRecord[]> {
    return this.records;
  }

  async exists(id: number): Promise<boolean> {
    return this.records.some((r) => r.id === id);
  }

  async create(data: SupplyData): Promise<SupplyRecord> {
    this.saved.push(data);
    const { nameKey: _key, salePrice: _price, ...fields } = data;
    const record = {
      id: this.records.length + 1,
      ...fields,
      saleProduct: null,
    };
    this.records.push(record);
    return record;
  }

  async update(
    id: number,
    data: SupplyData,
    today: string,
  ): Promise<SupplyRecord> {
    this.saved.push(data);
    const { nameKey: _key, salePrice, ...fields } = data;
    if (salePrice !== undefined)
      this.savedPrices.push({ id, salePrice, today });
    const record = {
      id,
      ...fields,
      saleProduct: this.saleProducts.get(id) ?? null,
    };
    this.records = this.records.map((r) => (r.id === id ? record : r));
    return record;
  }
}

const SODA = {
  name: 'Refrigerante iT Laranja 2L',
  countUnit: 'un',
  packages: [{ name: 'fardo', quantity: 6 }],
};

/** 23h de 09/10 em Brasília: em UTC já é dia 10. */
const LATE_NIGHT = new Date('2026-10-10T02:00:00Z');

function build() {
  const supplies = new FakeSupplyRepository();
  const service = new SupplyService(
    supplies,
    () => LATE_NIGHT,
    'America/Sao_Paulo',
  );
  return { service, supplies };
}

describe('SupplyService', () => {
  it('grava com a chave do nome sem acento e minúscula', async () => {
    const { service, supplies } = build();
    await service.create({ ...SODA, name: 'Pão Brioche' });
    expect(supplies.saved[0].nameKey).toBe('pao brioche');
  });

  it('atualiza trocando as embalagens', async () => {
    const { service } = build();
    const created = await service.create(SODA);
    const updated = await service.update(created.id, {
      ...SODA,
      packages: [{ name: 'fardo', quantity: 12 }],
    });
    expect(updated.packages).toEqual([{ name: 'fardo', quantity: '12' }]);
  });

  it('404 ao atualizar insumo inexistente', async () => {
    await expect(build().service.update(9, SODA)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('grava a seção quando ela existe', async () => {
    const { service } = build();
    const created = await service.create({ ...SODA, sectionId: 1 });
    expect(created.sectionId).toBe(1);
  });

  it('sem seção informada grava null', async () => {
    const { service } = build();
    expect((await service.create(SODA)).sectionId).toBeNull();
  });

  it('422 com a seção inexistente na mensagem', async () => {
    await expect(
      build().service.create({ ...SODA, sectionId: 7 }),
    ).rejects.toThrow(
      new UnprocessableEntityException(
        'Seção 7 não existe: esperado id de GET /supplies/sections',
      ),
    );
  });

  it('lista as seções do repositório', async () => {
    expect(await build().service.listSections()).toHaveLength(1);
  });

  it('grava o preço de venda de insumo com produto 1:1', async () => {
    const { service, supplies } = build();
    const created = await service.create(SODA);
    supplies.saleProducts.set(created.id, {
      id: 9,
      name: 'iT Laranja 2L',
      salePrice: '12.00',
      importSource: 'bebidas',
    });
    await service.update(created.id, { ...SODA, salePrice: 13.5 });
    // O dia de negócio data o histórico de preços do produto (reajuste de 2026-10-10).
    expect(supplies.savedPrices).toEqual([
      { id: created.id, salePrice: '13.50', today: '2026-10-09' },
    ]);
  });

  it('sem salePrice no corpo o preço não é tocado', async () => {
    const { service, supplies } = build();
    const created = await service.create(SODA);
    await service.update(created.id, SODA);
    expect(supplies.savedPrices).toEqual([]);
  });

  it('422 com o nome ao dar preço a insumo sem produto 1:1', async () => {
    const { service } = build();
    const created = await service.create(SODA);
    await expect(
      service.update(created.id, { ...SODA, salePrice: 5 }),
    ).rejects.toThrow(
      /Insumo "Refrigerante iT Laranja 2L" \(1\) não tem produto 1:1/,
    );
  });

  it('422 ao criar insumo já com preço de venda', async () => {
    await expect(
      build().service.create({ ...SODA, salePrice: 5 }),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it('lista o que o repositório tem', async () => {
    const { service } = build();
    await service.create(SODA);
    expect(await service.list()).toHaveLength(1);
  });
});
