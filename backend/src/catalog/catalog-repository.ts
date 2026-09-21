import type { DayGroup } from '../closing/business-date.js';

export const PAYMENT_METHOD_REPOSITORY = Symbol('PAYMENT_METHOD_REPOSITORY');
export const DELIVERY_ZONE_REPOSITORY = Symbol('DELIVERY_ZONE_REPOSITORY');
export const MOTOBOY_RATE_REPOSITORY = Symbol('MOTOBOY_RATE_REPOSITORY');

export interface PaymentMethodRecord {
  id: number;
  name: string;
  active: boolean;
  sortOrder: number;
}

export interface DeliveryZoneRecord {
  id: number;
  neighborhood: string;
  neighborhoodKey: string;
  fee: string;
  active: boolean;
}

export interface MotoboyRateRecord {
  id: number;
  dayGroup: DayGroup;
  amount: string;
  effectiveFrom: string;
  createdById: number;
}

export interface PaymentMethodRepository {
  list(): Promise<PaymentMethodRecord[]>;
  create(data: Omit<PaymentMethodRecord, 'id'>): Promise<PaymentMethodRecord>;
  update(
    id: number,
    data: Omit<PaymentMethodRecord, 'id'>,
  ): Promise<PaymentMethodRecord>;
}

export interface DeliveryZoneRepository {
  list(): Promise<DeliveryZoneRecord[]>;
  create(data: Omit<DeliveryZoneRecord, 'id'>): Promise<DeliveryZoneRecord>;
  update(
    id: number,
    data: Omit<DeliveryZoneRecord, 'id'>,
  ): Promise<DeliveryZoneRecord>;
}

export interface MotoboyRateRepository {
  list(): Promise<MotoboyRateRecord[]>;
  /** Grava a diária; se já existe uma para o mesmo grupo e a mesma data, troca o valor (correção). */
  save(data: Omit<MotoboyRateRecord, 'id'>): Promise<MotoboyRateRecord>;
}
