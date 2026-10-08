import { BadRequestException, NotFoundException } from '@nestjs/common';
import { toNeighborhoodKey } from '../delivery/neighborhood-key.js';
import type { CustomerInput } from './customer-input.js';
import type {
  CustomerRecord,
  CustomerRepository,
  CustomerZoneCheck,
} from './customer-repository.js';
import { CustomerService } from './customer.service.js';

class FakeCustomerRepository implements CustomerRepository {
  readonly records: CustomerRecord[] = [];

  async findByPhone(phone: string): Promise<CustomerRecord | null> {
    return this.records.find((r) => r.phone === phone) ?? null;
  }

  async findById(id: number): Promise<CustomerRecord | null> {
    return this.records.find((r) => r.id === id) ?? null;
  }

  async findByNameKey(
    nameKey: string,
    limit: number,
  ): Promise<CustomerRecord[]> {
    return this.records
      .filter((r) => toNeighborhoodKey(r.name) === nameKey)
      .slice(0, limit);
  }

  async listStreets(deliveryZoneId: number | null): Promise<string[]> {
    const streets = this.records
      .filter(
        (r) => deliveryZoneId === null || r.deliveryZoneId === deliveryZoneId,
      )
      .map((r) => r.street);
    return [...new Set(streets)].sort();
  }

  async create(data: CustomerInput): Promise<CustomerRecord> {
    const record = { id: this.records.length + 1, ...data };
    this.records.push(record);
    return record;
  }

  async update(id: number, data: CustomerInput): Promise<CustomerRecord> {
    const index = this.records.findIndex((r) => r.id === id);
    this.records[index] = { id, ...data };
    return this.records[index];
  }
}

/** Bairro 3 ativo, 4 inativo, demais inexistentes. */
class FakeCustomerZoneCheck implements CustomerZoneCheck {
  async isActive(deliveryZoneId: number): Promise<boolean> {
    return deliveryZoneId === 3;
  }
}

const ANA = {
  name: 'Ana',
  phone: '79 99999-1234',
  street: 'Rua A',
  deliveryZoneId: 3,
};

function build() {
  const customers = new FakeCustomerRepository();
  const service = new CustomerService(customers, new FakeCustomerZoneCheck());
  return { service, customers };
}

describe('CustomerService', () => {
  it('cadastra e encontra pelo telefone em outro formato', async () => {
    const { service } = build();
    const created = await service.create(ANA);
    expect(await service.searchByPhone('(79)99999-1234')).toEqual([created]);
  });

  it('acha pelo nome sem diferenciar acento, maiúscula e espaços', async () => {
    const { service } = build();
    const first = await service.create({ ...ANA, name: 'João Silva' });
    const second = await service.create({
      ...ANA,
      name: 'joao  silva',
      phone: null,
    });
    await service.create({ ...ANA, name: 'Ana', phone: null });
    expect(await service.searchByName(' JOAO SILVA ')).toEqual([first, second]);
  });

  it('busca por nome vazio ou ausente devolve lista vazia', async () => {
    const { service } = build();
    await service.create(ANA);
    expect(await service.searchByName('   ')).toEqual([]);
    expect(await service.searchByName(undefined)).toEqual([]);
  });

  it('busca sem telefone ou telefone desconhecido devolve lista vazia', async () => {
    const { service } = build();
    await service.create(ANA);
    expect(await service.searchByPhone(undefined)).toEqual([]);
    expect(await service.searchByPhone('79 98888-0000')).toEqual([]);
  });

  it('atualiza a rua do cadastro', async () => {
    const { service } = build();
    const created = await service.create(ANA);
    const updated = await service.update(created.id, {
      ...ANA,
      street: 'Rua B',
    });
    expect(updated).toMatchObject({ id: created.id, street: 'Rua B' });
  });

  it('rejeita bairro inativo ou inexistente', async () => {
    const { service } = build();
    await expect(service.create({ ...ANA, deliveryZoneId: 4 })).rejects.toThrow(
      BadRequestException,
    );
    await expect(
      service.create({ ...ANA, deliveryZoneId: 99 }),
    ).rejects.toThrow(/Bairro 99/);
  });

  it('lista ruas distintas, filtrando pelo bairro quando informado', async () => {
    const { service, customers } = build();
    await service.create(ANA);
    await service.create({ ...ANA, phone: '79 98888-0000' });
    customers.records.push({
      ...customers.records[0],
      id: 9,
      street: 'Rua Z',
      deliveryZoneId: 5,
    });
    expect(await service.listStreets(undefined)).toEqual(['Rua A', 'Rua Z']);
    expect(await service.listStreets('3')).toEqual(['Rua A']);
    await expect(service.listStreets('abc')).rejects.toThrow(/"abc"/);
  });

  it('404 ao atualizar cliente inexistente', async () => {
    await expect(build().service.update(42, ANA)).rejects.toThrow(
      NotFoundException,
    );
  });
});
