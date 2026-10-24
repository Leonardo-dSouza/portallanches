import { useState, type RefObject } from 'react';
import type { CashApi } from '../api/cash-api';
import { errorMessage } from '../api/error-message';
import type {
  SavedStaffConsumption,
  StaffConsumption,
  StaffConsumptionInput,
} from '../api/staff-consumption-types';
import type { MenuItem } from '../cash/menu-lookup';
import { linesOfOrder, type DraftLine } from '../cash/order-lines';
import { shortfallNotice } from '../cash/stock-notice';
import { useOrderItems, type OrderItemsState } from '../cash/use-order-items';
import { printSafely } from '../print/print-decision';
import { staffConsumptionReceipt } from '../print/receipt-model';
import type { ReceiptPrinter } from '../print/receipt-printer';
import { useTicketSettings } from '../print/ticket-settings';
import { buildConsumptionRequest } from './consumption-request';

interface UseStaffConsumptionFormArgs {
  cash: CashApi;
  menu: MenuItem[];
  editing: StaffConsumption | null;
  onSaved(): void;
  /** O "Para quem": o foco volta para ele depois de salvar. */
  nameRef: RefObject<HTMLInputElement | null>;
  printer: ReceiptPrinter;
  /** "Imprimir ao salvar" deste PC, o mesmo do pedido. */
  autoPrint: boolean;
}

export interface StaffConsumptionFormState {
  consumerName: string;
  setConsumerName(value: string): void;
  items: OrderItemsState;
  /** Linhas como estavam salvas (edição); vazio no lançamento novo. */
  savedLines: DraftLine[];
  error: string | null;
  /** Aviso do último consumo salvo (tirou além do estoque do sistema) ou da impressão. */
  notice: string | null;
  saving: boolean;
  submit(): Promise<void>;
}

/**
 * O formulário do consumo interno (2026-10-23): "Para quem" e os itens com o teclado do pedido;
 * salva, avisa o estoque, imprime o novo (na noite em andamento) e volta ao "Para quem".
 *
 * @example const form = useStaffConsumptionForm({ cash, menu, editing: null, onSaved, nameRef, printer, autoPrint });
 */
export function useStaffConsumptionForm(
  args: UseStaffConsumptionFormArgs,
): StaffConsumptionFormState {
  const { editing } = args;
  const [consumerName, setConsumerName] = useState(editing?.consumerName ?? '');
  const [savedLines] = useState(() =>
    editing ? linesOfOrder(editing.items) : [],
  );
  const items = useOrderItems(args.menu, savedLines);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const ticket = useTicketSettings();

  /** Só o lançamento novo imprime sozinho; a edição usa o Reimprimir da lista. */
  const printNew = (saved: SavedStaffConsumption): string | null => {
    if (!args.autoPrint || !saved.live || editing) return null;
    return printSafely(args.printer, staffConsumptionReceipt(saved, ticket));
  };
  const afterSave = (saved: SavedStaffConsumption) => {
    setConsumerName('');
    items.reset([]);
    setError(null);
    args.nameRef.current?.focus();
    args.onSaved();
    setNotice(
      printNew(saved) ?? shortfallNotice(saved.stockShortfalls, 'Consumido'),
    );
  };
  const persist = async (request: StaffConsumptionInput) => {
    setSaving(true);
    try {
      afterSave(
        await args.cash.saveStaffConsumption(editing?.id ?? null, request),
      );
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setSaving(false);
    }
  };
  const submit = async () => {
    const built = buildConsumptionRequest(consumerName, items.lines);
    if (!built.ok) return setError(built.error);
    await persist(built.request);
  };
  return {
    consumerName,
    setConsumerName,
    items,
    savedLines,
    error,
    notice,
    saving,
    submit,
  };
}
