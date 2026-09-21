import type {
  DeliveryZoneRecord,
  DeliveryZoneRepository,
  MotoboyRateRecord,
  MotoboyRateRepository,
  PaymentMethodRecord,
  PaymentMethodRepository,
} from './catalog-repository.js';
import { CatalogService } from './catalog.service.js';

class FakePaymentMethodRepository implements PaymentMethodRepository {
  readonly rows: PaymentMethodRecord[] = [];

  async list(): Promise<PaymentMethodRecord[]> {
    return this.rows;
  }

  async create(
    data: Omit<PaymentMethodRecord, 'id'>,
  ): Promise<PaymentMethodRecord> {
    const row = { id: this.rows.length + 1, ...data };
    this.rows.push(row);
    return row;
  }

  async update(
    id: number,
    data: Omit<PaymentMethodRecord, 'id'>,
  ): Promise<PaymentMethodRecord> {
    return { id, ...data };
  }
}

class FakeDeliveryZoneRepository implements DeliveryZoneRepository {
  async list(): Promise<DeliveryZoneRecord[]> {
    return [];
  }

  async create(
    data: Omit<DeliveryZoneRecord, 'id'>,
  ): Promise<DeliveryZoneRecord> {
    return { id: 1, ...data };
  }

  async update(
    id: number,
    data: Omit<DeliveryZoneRecord, 'id'>,
  ): Promise<DeliveryZoneRecord> {
    return { id, ...data };
  }
}

class FakeMotoboyRateRepository implements MotoboyRateRepository {
  readonly records: MotoboyRateRecord[] = [];

  async list(): Promise<MotoboyRateRecord[]> {
    return this.records;
  }

  /** Mesma regra do banco: grupo + data repetidos trocam o valor da linha existente. */
  async save(data: Omit<MotoboyRateRecord, 'id'>): Promise<MotoboyRateRecord> {
    const index = this.records.findIndex(
      (r) =>
        r.dayGroup === data.dayGroup && r.effectiveFrom === data.effectiveFrom,
    );
    const record = {
      id: index >= 0 ? this.records[index].id : this.records.length + 1,
      ...data,
    };
    if (index >= 0) this.records[index] = record;
    else this.records.push(record);
    return record;
  }
}

const build = (
  rates: MotoboyRateRepository = new FakeMotoboyRateRepository(),
): CatalogService =>
  new CatalogService(
    new FakePaymentMethodRepository(),
    new FakeDeliveryZoneRepository(),
    rates,
  );

describe('CatalogService', () => {
  it('cria forma de pagamento validada', async () => {
    const created = await build().createPaymentMethod({
      name: 'PIX',
      active: true,
      sortOrder: 1,
    });
    expect(created).toEqual({ id: 1, name: 'PIX', active: true, sortOrder: 1 });
  });

  it('atualiza forma de pagamento (inativar)', async () => {
    const updated = await build().updatePaymentMethod(4, {
      name: 'PIX',
      active: false,
      sortOrder: 1,
    });
    expect(updated).toMatchObject({ id: 4, active: false });
  });

  it('gera a chave do bairro sem acento e em minúsculas', async () => {
    const zone = await build().createDeliveryZone({
      neighborhood: ' São José ',
      fee: 4,
    });
    expect(zone).toMatchObject({
      neighborhood: 'São José',
      neighborhoodKey: 'sao jose',
      fee: '4.00',
    });
  });

  it('cria bairro ativo mesmo que o corpo peça inativo', async () => {
    const zone = await build().createDeliveryZone({
      neighborhood: 'Dunamis',
      fee: 8,
      active: false,
    });
    expect(zone.active).toBe(true);
  });

  it('atualiza a chave do bairro ao renomear', async () => {
    const zone = await build().updateDeliveryZone(2, {
      neighborhood: 'Água Verde',
      fee: 0,
      active: true,
    });
    expect(zone.neighborhoodKey).toBe('agua verde');
  });

  it('registra quem criou a diária', async () => {
    const rate = await build().createMotoboyRate(1, {
      dayGroup: 'TUE_THU',
      amount: 45,
      effectiveFrom: '2026-10-01',
    });
    expect(rate).toMatchObject({
      createdById: 1,
      amount: '45.00',
      effectiveFrom: '2026-10-01',
    });
  });

  it('repetir grupo e data corrige o valor em vez de criar outra linha', async () => {
    const rates = new FakeMotoboyRateRepository();
    const service = build(rates);
    const input = { dayGroup: 'FRI_SUN', effectiveFrom: '2026-10-01' };
    const wrong = await service.createMotoboyRate(1, { ...input, amount: 600 });
    const fixed = await service.createMotoboyRate(2, { ...input, amount: 60 });
    expect(fixed).toMatchObject({
      id: wrong.id,
      amount: '60.00',
      createdById: 2,
    });
    expect(rates.records).toHaveLength(1);
  });

  it('mesma data em grupos diferentes são linhas separadas', async () => {
    const rates = new FakeMotoboyRateRepository();
    const service = build(rates);
    await service.createMotoboyRate(1, {
      dayGroup: 'FRI_SUN',
      amount: 60,
      effectiveFrom: '2026-10-01',
    });
    await service.createMotoboyRate(1, {
      dayGroup: 'TUE_THU',
      amount: 40,
      effectiveFrom: '2026-10-01',
    });
    expect(rates.records).toHaveLength(2);
  });
});
