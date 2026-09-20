import { Inject, Injectable } from '@nestjs/common';
import { toNeighborhoodKey } from '../delivery/neighborhood-key.js';
import {
  parseDeliveryZoneInput,
  parseMotoboyRateInput,
  parsePaymentMethodInput,
} from './catalog-input.js';
import {
  DELIVERY_ZONE_REPOSITORY,
  MOTOBOY_RATE_REPOSITORY,
  PAYMENT_METHOD_REPOSITORY,
  type DeliveryZoneRecord,
  type DeliveryZoneRepository,
  type MotoboyRateRecord,
  type MotoboyRateRepository,
  type PaymentMethodRecord,
  type PaymentMethodRepository,
} from './catalog-repository.js';

/**
 * Cadastros que o admin mantém: formas de pagamento, bairros e diária do motoboy.
 * Nada é apagado: itens saem de uso via `active = false`, preservando o histórico.
 */
@Injectable()
export class CatalogService {
  constructor(
    @Inject(PAYMENT_METHOD_REPOSITORY)
    private readonly methods: PaymentMethodRepository,
    @Inject(DELIVERY_ZONE_REPOSITORY)
    private readonly zones: DeliveryZoneRepository,
    @Inject(MOTOBOY_RATE_REPOSITORY)
    private readonly rates: MotoboyRateRepository,
  ) {}

  listPaymentMethods(): Promise<PaymentMethodRecord[]> {
    return this.methods.list();
  }

  createPaymentMethod(body: unknown): Promise<PaymentMethodRecord> {
    return this.methods.create(parsePaymentMethodInput(body));
  }

  updatePaymentMethod(id: number, body: unknown): Promise<PaymentMethodRecord> {
    return this.methods.update(id, parsePaymentMethodInput(body));
  }

  listDeliveryZones(): Promise<DeliveryZoneRecord[]> {
    return this.zones.list();
  }

  createDeliveryZone(body: unknown): Promise<DeliveryZoneRecord> {
    return this.zones.create(this.toZoneData(body));
  }

  updateDeliveryZone(id: number, body: unknown): Promise<DeliveryZoneRecord> {
    return this.zones.update(id, this.toZoneData(body));
  }

  listMotoboyRates(): Promise<MotoboyRateRecord[]> {
    return this.rates.list();
  }

  /** Cada mudança de diária é uma nova linha (histórico); dias já fechados não mudam. */
  createMotoboyRate(userId: number, body: unknown): Promise<MotoboyRateRecord> {
    return this.rates.create({
      ...parseMotoboyRateInput(body),
      createdById: userId,
    });
  }

  private toZoneData(body: unknown): Omit<DeliveryZoneRecord, 'id'> {
    const input = parseDeliveryZoneInput(body);
    return { ...input, neighborhoodKey: toNeighborhoodKey(input.neighborhood) };
  }
}
