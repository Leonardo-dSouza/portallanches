import { useState, type Dispatch, type SetStateAction } from 'react';
import type { CashApi } from '../api/cash-api';
import type { Customer, DeliveryZone } from '../api/types';
import { phoneDigits } from './customer-draft';
import { typedMoney, type OrderFormValues } from './order-form-values';

// Menos que isso não é telefone (o backend aceita de 8 a 13 dígitos).
const MIN_PHONE_DIGITS = 8;

export interface CustomerLookup {
  /** Cadastro achado pelo telefone (ou do pedido em edição); null = cliente novo. */
  known: Customer | null;
  setKnown(customer: Customer | null): void;
  /** Busca pelo telefone digitado e, se achar, preenche nome, rua, bairro e taxa. */
  lookup(values: OrderFormValues): Promise<void>;
}

function filledFrom(
  values: OrderFormValues,
  customer: Customer,
  zones: DeliveryZone[],
): OrderFormValues {
  const zone = zones.find((z) => z.id === customer.deliveryZoneId);
  return {
    ...values,
    customerName: customer.name,
    street: customer.street,
    neighborhood: zone?.neighborhood ?? '',
    fee: zone ? typedMoney(zone.fee) : '',
  };
}

/**
 * @example const lookup = useCustomerLookup(cash, zones, setValues, null); await lookup.lookup(values);
 */
export function useCustomerLookup(
  cash: CashApi,
  zones: DeliveryZone[],
  setValues: Dispatch<SetStateAction<OrderFormValues>>,
  initial: Customer | null,
): CustomerLookup {
  const [known, setKnown] = useState<Customer | null>(initial);
  const lookup = async (values: OrderFormValues) => {
    const phone = phoneDigits(values.phone);
    if (phone.length < MIN_PHONE_DIGITS || known?.phone === phone) return;
    const [found] = await cash.findCustomersByPhone(phone);
    setKnown(found ?? null);
    if (found) setValues((current) => filledFrom(current, found, zones));
  };
  return { known, setKnown, lookup };
}
