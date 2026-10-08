import type { CustomerInput } from './customer-input.js';

export const CUSTOMER_REPOSITORY = Symbol('CUSTOMER_REPOSITORY');
export const CUSTOMER_ZONE_CHECK = Symbol('CUSTOMER_ZONE_CHECK');

/** Cliente lido do banco; o número é nulo só nos cadastrados antes de 2026-10-08. */
export interface CustomerRecord extends Omit<CustomerInput, 'number'> {
  id: number;
  number: string | null;
}

export interface CustomerRepository {
  findByPhone(phone: string): Promise<CustomerRecord | null>;
  findById(id: number): Promise<CustomerRecord | null>;
  /** Clientes com o nome normalizado igual a `nameKey`, mais recentes primeiro, até `limit`. */
  findByNameKey(nameKey: string, limit: number): Promise<CustomerRecord[]>;
  /** Ruas distintas já cadastradas, em ordem alfabética; `deliveryZoneId` null = todos os bairros. */
  listStreets(deliveryZoneId: number | null): Promise<string[]>;
  create(data: CustomerInput): Promise<CustomerRecord>;
  update(id: number, data: CustomerInput): Promise<CustomerRecord>;
}

/** Confere se o bairro do cliente existe e está ativo em delivery_zones. */
export interface CustomerZoneCheck {
  isActive(deliveryZoneId: number): Promise<boolean>;
}
