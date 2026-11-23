import type { DayGroup } from '../closing/business-date.js';

export const PAYMENT_METHOD_REPOSITORY = Symbol('PAYMENT_METHOD_REPOSITORY');
export const DELIVERY_ZONE_REPOSITORY = Symbol('DELIVERY_ZONE_REPOSITORY');
export const MOTOBOY_RATE_REPOSITORY = Symbol('MOTOBOY_RATE_REPOSITORY');

export interface PaymentMethodRecord {
  id: number;
  name: string;
  active: boolean;
  sortOrder: number;
  isCardTerminal: boolean;
  isCash: boolean;
  /** Fiado (2026-10-25): fora da gaveta, cobrado depois. */
  isFiado: boolean;
  /**
   * A forma do pedido iFood (2026-11-23), criada pela migração: só leitura. Fica fora das teclas
   * de pagamento e da gaveta; a API grava sozinha no pedido IFOOD.
   */
  isIfood: boolean;
}

/** O que o admin grava numa forma: tudo menos o id e a marca do iFood (só a migração cria). */
export type PaymentMethodData = Omit<PaymentMethodRecord, 'id' | 'isIfood'>;

export interface DeliveryZoneRecord {
  id: number;
  neighborhood: string;
  neighborhoodKey: string;
  fee: string;
  active: boolean;
  /** O pedido para o bairro ganha o código de entrega (2026-11-21). */
  requiresDeliveryCode: boolean;
}

export interface MotoboyRateRecord {
  id: number;
  dayGroup: DayGroup;
  amount: string;
  effectiveFrom: string;
  createdById: number;
}

export interface PaymentMethodRepository {
  /** Na ordem das teclas do caixa (`sortOrder`, depois id). */
  list(): Promise<PaymentMethodRecord[]>;
  /** `sortOrder` = posição na lista (1, 2, 3…), numa transação. */
  reorder(ids: number[]): Promise<void>;
  create(data: PaymentMethodData): Promise<PaymentMethodRecord>;
  update(id: number, data: PaymentMethodData): Promise<PaymentMethodRecord>;
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
