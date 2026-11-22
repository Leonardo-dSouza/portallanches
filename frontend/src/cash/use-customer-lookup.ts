import { useState, type Dispatch, type SetStateAction } from 'react';
import type { CashApi } from '../api/cash-api';
import type { Customer, DeliveryZone } from '../api/types';
import { toNeighborhoodKey } from './neighborhood-key';
import { zoneDefaults, type OrderFormValues } from './order-form-values';

/** O cliente para gravar e o formulário com os dados dele (como na busca ao sair do campo). */
export interface ResolvedCustomer {
  known: Customer | null;
  values: OrderFormValues;
}

export interface CustomerLookup {
  /** Cadastro achado pelo nome (ou do pedido em edição); null = cliente novo. */
  known: Customer | null;
  /**
   * O cadastro veio da busca pelo nome: pode ser um homônimo, então outro endereço pergunta se
   * é outra pessoa (S5-11). O do pedido em edição não pergunta.
   */
  byName: boolean;
  /** Homônimos achados pelo nome, para o caixa escolher pela rua; vazio = nada a escolher. */
  candidates: Customer[];
  /** Limpa o cliente e a lista de homônimos (comanda nova). */
  reset(): void;
  /**
   * Busca pelo nome (o formulário não tem telefone desde 2026-11-21): 1 achado preenche rua,
   * bairro, taxa e código; vários viram `candidates`.
   */
  lookupName(values: OrderFormValues): Promise<void>;
  /** O caixa escolheu um dos homônimos: preenche como no achado único. */
  choose(customer: Customer): void;
  /**
   * Na hora de salvar o fiado do balcão (Enter direto no Nome, sem sair do campo): o cliente já
   * achado, ou procurado agora. Homônimos ainda não mostrados viram `candidates` e voltam null
   * (o caixa escolhe); com a lista à vista, seguir é cadastrar um novo.
   */
  resolve(values: OrderFormValues): Promise<ResolvedCustomer | null>;
  /** Avisa que o caixa digitou num campo, para esquecer o cliente quando ele deixa de ser o mesmo. */
  typed(field: keyof OrderFormValues, value: string): void;
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
    street: customer.street ?? '',
    houseNumber: customer.number ?? '',
    reference: customer.reference ?? '',
    neighborhood: zone?.neighborhood ?? '',
    ...zoneDefaults(zone),
  };
}

/**
 * O nome identifica o cliente, então outro nome é outra pessoa: assim o cadastro achado não é
 * sobrescrito com a pessoa errada.
 */
function isAnotherCustomer(
  known: Customer,
  field: keyof OrderFormValues,
  value: string,
): boolean {
  if (field !== 'customerName') return false;
  return toNeighborhoodKey(value) !== toNeighborhoodKey(known.name);
}

/**
 * @example const lookup = useCustomerLookup(cash, zones, setValues, null); await lookup.lookupName(values);
 */
export function useCustomerLookup(
  cash: CashApi,
  zones: DeliveryZone[],
  setValues: Dispatch<SetStateAction<OrderFormValues>>,
  initial: Customer | null,
): CustomerLookup {
  const [known, setKnown] = useState<Customer | null>(initial);
  // O cliente do pedido em edição não veio pelo nome: na edição não se pergunta (S5-11).
  const [byName, setByName] = useState(false);
  const [candidates, setCandidates] = useState<Customer[]>([]);
  const forget = () => {
    setKnown(null);
    setByName(false);
  };
  const fill = (customer: Customer) => {
    setKnown(customer);
    setByName(true);
    setCandidates([]);
    setValues((current) => filledFrom(current, customer, zones));
  };
  const findByName = (values: OrderFormValues): Promise<Customer[]> => {
    const name = values.customerName.trim();
    return name ? cash.findCustomersByName(name) : Promise.resolve([]);
  };
  const lookupName = async (values: OrderFormValues) => {
    if (known) return;
    const found = await findByName(values);
    if (found.length === 1) return fill(found[0]);
    setCandidates(found);
  };
  const typed: CustomerLookup['typed'] = (field, value) => {
    if (field === 'customerName') setCandidates([]);
    if (known && isAnotherCustomer(known, field, value)) forget();
  };
  const reset = () => {
    forget();
    setCandidates([]);
  };
  const resolve = async (values: OrderFormValues) => {
    if (known || candidates.length > 0) return { known, values };
    const found = await findByName(values);
    if (found.length > 1) {
      setCandidates(found);
      return null;
    }
    if (found.length === 0) return { known: null, values };
    fill(found[0]);
    return { known: found[0], values: filledFrom(values, found[0], zones) };
  };
  return {
    known,
    byName,
    candidates,
    reset,
    lookupName,
    choose: fill,
    typed,
    resolve,
  };
}
