import type { CustomerInput } from './customer-input.js';

export const CUSTOMER_REPOSITORY = Symbol('CUSTOMER_REPOSITORY');
export const CUSTOMER_ZONE_CHECK = Symbol('CUSTOMER_ZONE_CHECK');

/**
 * Cliente lido do banco; o número é nulo nos cadastrados antes de 2026-10-08 e, com a rua e o
 * bairro, no cliente do balcão (fiado, 2026-10-25).
 */
export interface CustomerRecord extends CustomerInput {
  id: number;
}

/** Quantos clientes moram numa rua de um bairro (a rua escrita como foi cadastrada). */
export interface StreetZoneCount {
  street: string;
  deliveryZoneId: number;
  customers: number;
}

export interface CustomerRepository {
  findByPhone(phone: string): Promise<CustomerRecord | null>;
  findById(id: number): Promise<CustomerRecord | null>;
  /** Clientes com o nome normalizado igual a `nameKey`, mais recentes primeiro, até `limit`. */
  findByNameKey(nameKey: string, limit: number): Promise<CustomerRecord[]>;
  /**
   * Ruas distintas já cadastradas, em ordem alfabética; `deliveryZoneId` null = todos os bairros.
   * O cliente do balcão (sem rua) fica de fora.
   */
  listStreets(deliveryZoneId: number | null): Promise<string[]>;
  /** Uma linha por rua + bairro dos clientes cadastrados (os sem endereço ficam de fora). */
  countStreetZones(): Promise<StreetZoneCount[]>;
  create(data: CustomerInput): Promise<CustomerRecord>;
  update(id: number, data: CustomerInput): Promise<CustomerRecord>;
}

/** Confere se o bairro do cliente existe e está ativo em delivery_zones. */
export interface CustomerZoneCheck {
  isActive(deliveryZoneId: number): Promise<boolean>;
}
