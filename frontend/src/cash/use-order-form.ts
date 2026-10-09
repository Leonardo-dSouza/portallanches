import { useState, type RefObject } from 'react';
import { flushSync } from 'react-dom';
import type { CashApi } from '../api/cash-api';
import { errorMessage } from '../api/error-message';
import type {
  Customer,
  DeliveryZone,
  Order,
  PaymentMethod,
} from '../api/types';
import {
  buildOrderRequest,
  EMPTY_ORDER_FORM,
  findZone,
  formValuesOf,
  withOrderField,
  type OrderFormValues,
} from './order-form-values';
import { customerOfOrder } from './customer-draft';
import type { MenuItem } from './menu-lookup';
import { linesOfOrder } from './order-lines';
import { missingPaymentMode } from './payment-choice';
import { saveOrderRequest } from './save-order';
import { snapStreet } from './street-key';
import { fillZoneFromStreet } from './street-zone';
import { useCustomerLookup } from './use-customer-lookup';
import { useOrderItems, type OrderItemsState } from './use-order-items';
import { useStreetSuggestions } from './use-street-suggestions';
import { useStreetZones } from './use-street-zones';

/** Campos que recebem o foco: Item (balcão e após salvar) e Telefone (entrega). */
export interface OrderFocusRefs {
  item: RefObject<HTMLInputElement | null>;
  phone: RefObject<HTMLInputElement | null>;
}

interface UseOrderFormArgs {
  cash: CashApi;
  zones: DeliveryZone[];
  /** Para saber se a forma escolhida é maquininha (que exige o meio). */
  methods: PaymentMethod[];
  menu: MenuItem[];
  editing: Order | null;
  onSaved(): void;
  focus: OrderFocusRefs;
}

export interface OrderFormState {
  values: OrderFormValues;
  items: OrderItemsState;
  error: string | null;
  saving: boolean;
  newZoneName: string | null;
  /** Entrega com cliente já cadastrado (true) ou a cadastrar ao salvar (false). */
  knownCustomer: boolean;
  /** Homônimos achados pelo nome (sem telefone) para o caixa escolher. */
  customerChoices: Customer[];
  chooseCustomer(customer: Customer): void;
  /** Ruas já cadastradas no bairro digitado (ou em todos, sem bairro). */
  streets: string[];
  /**
   * Ao sair do campo Rua: adota a grafia de uma rua já cadastrada, se for a mesma, e com o
   * Bairro vazio preenche o bairro dessa rua (e a taxa).
   */
  snapStreet(): void;
  setField<K extends keyof OrderFormValues>(field: K, value: string): void;
  /** F2: troca Balcão/Entrega e leva o foco ao primeiro campo do tipo novo. */
  toggleType(): void;
  lookupPhone(): Promise<void>;
  /** Ao sair do campo Nome sem telefone: procura o cliente pelo nome. */
  lookupName(): Promise<void>;
  submit(): Promise<void>;
}

export function useOrderForm(args: UseOrderFormArgs): OrderFormState {
  const { cash, zones, editing, onSaved, focus } = args;
  const [values, setValues] = useState(() =>
    editing ? formValuesOf(editing, zones) : EMPTY_ORDER_FORM,
  );
  const items = useOrderItems(
    args.menu,
    editing ? linesOfOrder(editing.items) : [],
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const customer = useCustomerLookup(
    cash,
    zones,
    setValues,
    editing && customerOfOrder(editing),
  );

  const setField = (field: keyof OrderFormValues, value: string) => {
    customer.typed(field, value, values);
    setValues((current) => withOrderField(current, field, value, zones));
  };

  const streets = useStreetSuggestions(
    cash,
    findZone(zones, values.neighborhood)?.id ?? null,
    values.type === 'DELIVERY',
  );
  const streetZones = useStreetZones(cash, values.type === 'DELIVERY');
  const snapTypedStreet = () =>
    setValues((current) => {
      const street = snapStreet(current.street, streets);
      return fillZoneFromStreet({ ...current, street }, streetZones, zones);
    });

  const reportingErrors = (search: () => Promise<void>) => async () => {
    try {
      await search();
    } catch (failure) {
      setError(errorMessage(failure));
    }
  };
  const lookupPhone = reportingErrors(() => customer.lookup(values));
  const lookupName = reportingErrors(() => customer.lookupName(values));

  const toggleType = () => {
    const next = values.type === 'COUNTER' ? 'DELIVERY' : 'COUNTER';
    // O Telefone só existe depois de renderizar a entrega: grava o tipo antes de focar.
    flushSync(() => setValues((current) => ({ ...current, type: next })));
    (next === 'DELIVERY' ? focus.phone : focus.item).current?.focus();
  };

  const submit = async () => {
    const built = buildOrderRequest(values, items.lines, zones, customer.known);
    if (!built.ok) return setError(built.error);
    const modeMissing = missingPaymentMode(values, args.methods);
    if (modeMissing) return setError(modeMissing);
    setSaving(true);
    try {
      await saveOrderRequest(cash, editing?.id ?? null, built.request);
      // Próxima comanda do monte: tudo limpo (inclusive o pagamento, para não herdar o
      // da anterior sem perceber), balcão e foco no Item.
      setValues(EMPTY_ORDER_FORM);
      items.reset([]);
      customer.reset();
      setError(null);
      onSaved();
      focus.item.current?.focus();
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setSaving(false);
    }
  };

  const typedZone = values.neighborhood.trim();
  const isNew =
    values.type === 'DELIVERY' && typedZone && !findZone(zones, typedZone);
  return {
    values,
    items,
    error,
    saving,
    newZoneName: isNew ? typedZone : null,
    knownCustomer: customer.known !== null,
    customerChoices: customer.candidates,
    chooseCustomer: customer.choose,
    streets,
    snapStreet: snapTypedStreet,
    setField,
    toggleType,
    lookupPhone,
    lookupName,
    submit,
  };
}
