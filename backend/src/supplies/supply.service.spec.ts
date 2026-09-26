import { NotFoundException } from '@nestjs/common';
import type {
  SupplyData,
  SupplyRecord,
  SupplyRepository,
} from './supply-repository.js';
import { SupplyService } from './supply.service.js';

class FakeSupplyRepository implements SupplyRepository {
  readonly saved: SupplyData[] = [];
  records: SupplyRecord[] = [];

  async list(): Promise<SupplyRecord[]> {
    return this.records;
  }

  async exists(id: number): Promise<boolean> {
    return this.records.some((r) => r.id === id);
  }

  async create(data: SupplyData): Promise<SupplyRecord> {
    this.saved.push(data);
    const { nameKey: _key, ...fields } = data;
    const record = { id: this.records.length + 1, ...fields };
    this.records.push(record);
    return record;
  }

  async update(id: number, data: SupplyData): Promise<SupplyRecord> {
    this.saved.push(data);
    const { nameKey: _key, ...fields } = data;
    this.records = this.records.map((r) =>
      r.id === id ? { id, ...fields } : r,
    );
    return { id, ...fields };
  }
}

const SODA = {
  name: 'Refrigerante iT Laranja 2L',
  countUnit: 'un',
  packages: [{ name: 'fardo', quantity: 6 }],
};

function build() {
  const supplies = new FakeSupplyRepository();
  return { service: new SupplyService(supplies), supplies };
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

  it('lista o que o repositório tem', async () => {
    const { service } = build();
    await service.create(SODA);
    expect(await service.list()).toHaveLength(1);
  });
});
