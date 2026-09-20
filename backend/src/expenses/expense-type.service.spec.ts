import {
  BadRequestException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type {
  ExpenseTypeData,
  ExpenseTypeRecord,
  ExpenseTypeRepository,
} from './expense-type-repository.js';
import { ExpenseTypeService } from './expense-type.service.js';

class FakeExpenseTypeRepository implements ExpenseTypeRepository {
  readonly records: ExpenseTypeRecord[] = [];

  async list(): Promise<ExpenseTypeRecord[]> {
    return this.records;
  }

  async findById(id: number): Promise<ExpenseTypeRecord | null> {
    return this.records.find((r) => r.id === id) ?? null;
  }

  async create(data: ExpenseTypeData): Promise<ExpenseTypeRecord> {
    const record = { id: this.records.length + 1, ...data };
    this.records.push(record);
    return record;
  }

  async update(id: number, data: ExpenseTypeData): Promise<ExpenseTypeRecord> {
    const index = this.records.findIndex((r) => r.id === id);
    this.records[index] = { id, ...data };
    return this.records[index];
  }
}

const build = (): ExpenseTypeService =>
  new ExpenseTypeService(new FakeExpenseTypeRepository());

describe('ExpenseTypeService', () => {
  it('cria tipo ativo com chave sem acento, mesmo que o corpo peça inativo', async () => {
    const created = await build().create({
      name: ' Compra no Atacadão ',
      active: false,
    });
    expect(created).toEqual({
      id: 1,
      name: 'Compra no Atacadão',
      nameKey: 'compra no atacadao',
      active: true,
    });
  });

  it('rejeita tipo sem nome', async () => {
    await expect(build().create({ name: '  ' })).rejects.toThrow(
      BadRequestException,
    );
  });

  it('admin desativa e renomeia; a chave acompanha o nome', async () => {
    const service = build();
    await service.create({ name: 'Gás' });
    const updated = await service.update(1, { name: 'Gás GLP', active: false });
    expect(updated).toMatchObject({ nameKey: 'gas glp', active: false });
    await expect(service.update(1, { name: 'Gás' })).rejects.toThrow(
      BadRequestException,
    );
  });

  it('requireActive: 404 para inexistente e 422 para inativo', async () => {
    const service = build();
    await service.create({ name: 'Gás' });
    await service.update(1, { name: 'Gás', active: false });
    await expect(service.requireActive(9)).rejects.toThrow(NotFoundException);
    await expect(service.requireActive(1)).rejects.toThrow(
      UnprocessableEntityException,
    );
  });
});
