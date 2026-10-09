import {
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type {
  CategoryData,
  CategoryRecord,
  ProductCategoryRepository,
} from './product-category-repository.js';
import { ProductCategoryService } from './product-category.service.js';

/** Categorias em memória, ordenadas como o Prisma devolve (ordem e nome). */
class FakeProductCategoryRepository implements ProductCategoryRepository {
  records: CategoryRecord[] = [
    {
      id: 1,
      name: 'Tradicional',
      nameKey: 'tradicional',
      sortOrder: 1,
      active: true,
    },
    { id: 7, name: 'Açaí', nameKey: 'acai', sortOrder: 2, active: true },
  ];

  async list(): Promise<CategoryRecord[]> {
    return [...this.records].sort((a, b) => a.sortOrder - b.sortOrder);
  }

  async findById(id: number): Promise<CategoryRecord | null> {
    return this.records.find((r) => r.id === id) ?? null;
  }

  async create(data: CategoryData): Promise<CategoryRecord> {
    const record = { id: 10 + this.records.length, ...data };
    this.records.push(record);
    return record;
  }

  async update(
    id: number,
    data: Omit<CategoryData, 'sortOrder'>,
  ): Promise<CategoryRecord> {
    const index = this.records.findIndex((r) => r.id === id);
    this.records[index] = { ...this.records[index], ...data };
    return this.records[index];
  }

  async reorder(ids: number[]): Promise<void> {
    this.records = this.records.map((r) => ({
      ...r,
      sortOrder: ids.indexOf(r.id) + 1,
    }));
  }
}

function build() {
  const categories = new FakeProductCategoryRepository();
  const service = new ProductCategoryService(
    categories,
    new Set(['tradicional']),
  );
  return { service, categories };
}

describe('ProductCategoryService', () => {
  it('lista na ordem e marca as categorias que vêm das planilhas', async () => {
    const listed = await build().service.list();
    expect(listed.map((c) => [c.name, c.importLocked])).toEqual([
      ['Tradicional', true],
      ['Açaí', false],
    ]);
  });

  it('categoria nova entra no fim da ordem, com a chave do nome', async () => {
    const created = await build().service.create({ name: 'Combos' });
    expect(created).toMatchObject({
      name: 'Combos',
      nameKey: 'combos',
      sortOrder: 3,
      active: true,
      importLocked: false,
    });
  });

  it('renomeia categoria cadastrada pela tela', async () => {
    const updated = await build().service.update(7, {
      name: 'Açaí no copo',
      active: true,
    });
    expect(updated).toMatchObject({
      name: 'Açaí no copo',
      nameKey: 'acai no copo',
    });
  });

  it('categoria de planilha não muda de nome, mas desativa', async () => {
    const { service } = build();
    await expect(
      service.update(1, { name: 'Lanches', active: true }),
    ).rejects.toThrow(/"Tradicional" vem da planilha/);
    const updated = await service.update(1, {
      name: 'Tradicional',
      active: false,
    });
    expect(updated.active).toBe(false);
  });

  it('categoria inexistente → 404', async () => {
    await expect(
      build().service.update(99, { name: 'X', active: true }),
    ).rejects.toThrow(NotFoundException);
  });

  it('reordena com todos os ids e devolve a lista nova', async () => {
    const listed = await build().service.reorder({ ids: [7, 1] });
    expect(listed.map((c) => c.id)).toEqual([7, 1]);
  });

  it('reordenar sem todas as categorias → 422 citando as que faltam', async () => {
    const { service } = build();
    await expect(service.reorder({ ids: [7] })).rejects.toThrow(
      UnprocessableEntityException,
    );
    await expect(service.reorder({ ids: [7, 1, 5] })).rejects.toThrow(
      /esperado exatamente os ids 1, 7/,
    );
  });
});
