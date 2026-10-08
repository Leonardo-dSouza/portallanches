import { useState, type Dispatch, type SetStateAction } from 'react';
import type { CashApi } from '../api/cash-api';
import type { Customer, DeliveryZone } from '../api/types';
import { phoneDigits } from './customer-draft';
import { toNeighborhoodKey } from './neighborhood-key';
import { typedMoney, type OrderFormValues } from './order-form-values';

// Menos que isso não é telefone (o backend aceita de 8 a 13 dígitos).
const MIN_PHONE_DIGITS = 8;

export interface CustomerLookup {
  /** Cadastro achado pelo telefone ou nome (ou do pedido em edição); null = cliente novo. */
  known: Customer | null;
  /** Homônimos achados pelo nome, para o caixa escolher pela rua; vazio = nada a escolher. */
  candidates: Customer[];
  /** Limpa o cliente e a lista de homônimos (comanda nova). */
  reset(): void;
  /** Busca pelo telefone digitado e, se achar, preenche nome, rua, bairro e taxa. */
  lookup(values: OrderFormValues): Promise<void>;
  /** Sem telefone: busca pelo nome; 1 achado preenche, vários viram `candidates`. */
  lookupName(values: OrderFormValues): Promise<void>;
  /** O caixa escolheu um dos homônimos: preenche como na busca pelo telefone. */
  choose(customer: Customer): void;
  /** Avisa que o caixa digitou num campo, para esquecer o cliente quando ele deixa de ser o mesmo. */
  typed(
    field: keyof OrderFormValues,
    value: string,
    values: OrderFormValues,
  ): void;
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
 * Outro telefone = outro cliente. Sem telefone o nome identifica o cliente, então outro nome
 * também é outra pessoa: assim o cadastro achado pelo nome não é sobrescrito com a pessoa errada.
 */
function isAnotherCustomer(
  known: Customer,
  field: keyof OrderFormValues,
  value: string,
  values: OrderFormValues,
): boolean {
  if (field === 'phone') return true;
  if (field !== 'customerName' || phoneDigits(values.phone)) return false;
  return toNeighborhoodKey(value) !== toNeighborhoodKey(known.name);
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
  const [candidates, setCandidates] = useState<Customer[]>([]);
  const fill = (customer: Customer, withPhone: boolean) => {
    setKnown(customer);
    setCandidates([]);
    setValues((current) => ({
      ...filledFrom(current, customer, zones),
      phone: withPhone && customer.phone ? customer.phone : current.phone,
    }));
  };
  const lookup = async (values: OrderFormValues) => {
    const phone = phoneDigits(values.phone);
    if (phone.length < MIN_PHONE_DIGITS || known?.phone === phone) return;
    const [found] = await cash.findCustomersByPhone(phone);
    if (found) return fill(found, false);
    setKnown(null);
  };
  const lookupName = async (values: OrderFormValues) => {
    const name = values.customerName.trim();
    if (!name || known || phoneDigits(values.phone)) return;
    const found = await cash.findCustomersByName(name);
    if (found.length === 1) return fill(found[0], true);
    setCandidates(found);
  };
  const typed: CustomerLookup['typed'] = (field, value, values) => {
    if (field === 'phone' || field === 'customerName') setCandidates([]);
    if (known && isAnotherCustomer(known, field, value, values)) setKnown(null);
  };
  const reset = () => {
    setKnown(null);
    setCandidates([]);
  };
  const choose = (customer: Customer) => fill(customer, true);
  return { known, candidates, reset, lookup, lookupName, choose, typed };
}
