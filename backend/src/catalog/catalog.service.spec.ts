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
  async list(): Promise<MotoboyRateRecord[]> {
    return [];
  }

  async create(
    data: Omit<MotoboyRateRecord, 'id'>,
  ): Promise<MotoboyRateRecord> {
    return { id: 1, ...data };
  }
}

const build = (): CatalogService =>
  new CatalogService(
    new FakePaymentMethodRepository(),
    new FakeDeliveryZoneRepository(),
    new FakeMotoboyRateRepository(),
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
      active: true,
    });
    expect(zone).toMatchObject({
      neighborhood: 'São José',
      neighborhoodKey: 'sao jose',
      fee: '4.00',
    });
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
});
