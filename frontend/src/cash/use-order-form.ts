import { useState, type RefObject } from 'react';
import { flushSync } from 'react-dom';
import type { CashApi } from '../api/cash-api';
import { errorMessage } from '../api/error-message';
import type {
  Customer,
  DeliveryZone,
  Order,
  PaymentMethod,
  SavedOrder,
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
import {
  useManagerRetry,
  type ManagerRetry,
} from '../manager/use-manager-retry';
import { linesOfOrder, type DraftLine } from './order-lines';
import { isFiadoChoice, missingPaymentMode } from './payment-choice';
import { receiptAfterSave, printSafely } from '../print/print-decision';
import type { ReceiptPrinter } from '../print/receipt-printer';
import { useTicketSettings } from '../print/ticket-settings';
import { saveOrderRequest } from './save-order';
import { shortfallNotice } from './stock-notice';
import { snapStreet } from './street-key';
import { fillZoneFromStreet } from './street-zone';
import {
  useCustomerLookup,
  type ResolvedCustomer,
} from './use-customer-lookup';
import { useOrderItems, type OrderItemsState } from './use-order-items';
import { useStreetSuggestions } from './use-street-suggestions';
import { useStreetZones } from './use-street-zones';

/** Campos que recebem o foco: Qtd, o começo do item (balcão e após salvar), e Telefone (entrega). */
export interface OrderFocusRefs {
  entry: RefObject<HTMLInputElement | null>;
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
  printer: ReceiptPrinter;
  /** "Imprimir a comanda ao salvar" deste PC (ver `useAutoPrint`). */
  autoPrint: boolean;
}

export interface OrderFormState {
  values: OrderFormValues;
  items: OrderItemsState;
  error: string | null;
  /** Aviso do último pedido salvo (vendeu além do estoque do sistema). */
  notice: string | null;
  saving: boolean;
  newZoneName: string | null;
  /** Entrega com cliente já cadastrado (true) ou a cadastrar ao salvar (false). */
  knownCustomer: boolean;
  /** Id do cliente achado (o "Já deve" do fiado); null = cliente novo ou nenhum. */
  knownCustomerId: number | null;
  /** A forma escolhida é o fiado (2026-10-25): a comanda pede o cliente e o "Pagar em". */
  fiado: boolean;
  /** Escolheu a tecla Fiado no balcão: o nome já digitado vira o nome do cliente. */
  chooseFiado(): void;
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
  /** Limpar tudo (2026-10-15): a comanda volta ao começo, como depois de salvar. */
  clearAll(): void;
  /** Linhas do pedido como estava salvo (edição); vazio no pedido novo. */
  savedLines: DraftLine[];
  /** A janela da senha do admin, quando a edição baixa o valor ou troca a forma. */
  retry: ManagerRetry;
}

export function useOrderForm(args: UseOrderFormArgs): OrderFormState {
  const { cash, zones, editing, onSaved, focus } = args;
  const [values, setValues] = useState(() =>
    editing ? formValuesOf(editing, zones) : EMPTY_ORDER_FORM,
  );
  const [savedLines] = useState(() =>
    editing ? linesOfOrder(editing.items) : [],
  );
  const items = useOrderItems(args.menu, savedLines);
  const [error, setError] = useState<string | null>(null);
  const retry = useManagerRetry(setError);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const ticket = useTicketSettings();
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
    flushSync(() =>
      setValues((current) => withOrderField(current, 'type', next, zones)),
    );
    (next === 'DELIVERY' ? focus.phone : focus.entry).current?.focus();
  };

  const fiado = isFiadoChoice(values.paymentMethodId, args.methods);
  const chooseFiado = () =>
    setValues((current) =>
      current.type === 'COUNTER' && !current.customerName.trim()
        ? { ...current, customerName: current.counterName }
        : current,
    );

  /** O fiado do balcão procura o cliente antes de gravar (Enter direto no Nome do cliente). */
  const customerToSave = async (): Promise<ResolvedCustomer | null> => {
    if (values.type !== 'COUNTER' || !fiado)
      return { known: customer.known, values };
    try {
      return await customer.resolve(values);
    } catch (failure) {
      setError(errorMessage(failure));
      return null;
    }
  };

  /** Comanda em branco: balcão, sem itens nem pagamento, foco no Qtd. */
  const blankForm = () => {
    setValues(EMPTY_ORDER_FORM);
    items.reset([]);
    customer.reset();
    setError(null);
    focus.entry.current?.focus();
  };

  /** Pedido novo inteiro, ou a comanda ALTERADO da edição (ver `receiptAfterSave`); erro vira aviso. */
  const printAfterSave = (saved: SavedOrder) => {
    if (!args.autoPrint) return;
    const day = { paymentMethods: args.methods, zones, ticket };
    const receipt = receiptAfterSave(saved, editing, day);
    const problem = receipt && printSafely(args.printer, receipt);
    if (problem) setNotice(problem);
  };

  const submit = async () => {
    const resolved = await customerToSave();
    if (!resolved) return;
    const built = buildOrderRequest(
      resolved.values,
      items.lines,
      zones,
      resolved.known,
      args.methods,
    );
    if (!built.ok) return setError(built.error);
    const modeMissing = missingPaymentMode(values, args.methods);
    if (modeMissing) return setError(modeMissing);
    const persist = async (managerPassword?: string) => {
      const saved = await saveOrderRequest(
        cash,
        editing?.id ?? null,
        built.request,
        managerPassword,
      );
      // A venda sai mesmo além do saldo; o aviso fica até o próximo pedido salvo.
      setNotice(shortfallNotice(saved.stockShortfalls));
      // Próxima comanda do monte: tudo limpo (inclusive o pagamento, para não herdar o
      // da anterior sem perceber), balcão e foco no Qtd.
      blankForm();
      onSaved();
      printAfterSave(saved);
    };
    setSaving(true);
    // Fora da trava, baixar o valor ou trocar a forma pede a senha do admin (2026-10-15).
    await retry.run(
      persist,
      `Salvar o #${editing?.dayNumber}: baixa o valor ou troca a forma de pagamento`,
    );
    setSaving(false);
  };

  const typedZone = values.neighborhood.trim();
  const isNew =
    values.type === 'DELIVERY' && typedZone && !findZone(zones, typedZone);
  return {
    values,
    items,
    error,
    notice,
    saving,
    newZoneName: isNew ? typedZone : null,
    knownCustomer: customer.known !== null,
    knownCustomerId: customer.known?.id ?? null,
    fiado,
    chooseFiado,
    customerChoices: customer.candidates,
    chooseCustomer: customer.choose,
    streets,
    snapStreet: snapTypedStreet,
    setField,
    toggleType,
    lookupPhone,
    lookupName,
    submit,
    clearAll: () => {
      setNotice(null);
      blankForm();
    },
    savedLines,
    retry,
  };
}
