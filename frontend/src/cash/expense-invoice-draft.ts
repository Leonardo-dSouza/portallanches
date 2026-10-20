import type {
  ExpenseInvoiceSummary,
  InvoicePreview,
} from '../api/invoice-types';
import type { Expense, ExpenseInput, ExpenseType } from '../api/types';
import type { ExpenseFormValues } from './expense-form-values';
import { typedMoney } from './order-form-values';

/**
 * A nota no formulário de gasto: nenhuma, a do gasto em edição (mantida), uma lida agora na
 * SEFAZ ou a do gasto tirada pelo caixa.
 */
export type InvoiceDraft =
  | { kind: 'none' }
  | { kind: 'kept'; summary: ExpenseInvoiceSummary }
  | { kind: 'read'; code: string; preview: InvoicePreview }
  | { kind: 'removed' };

/** O que o cartão da nota mostra no formulário. */
export interface InvoiceCard {
  vendorName: string;
  issuedAt: string;
  /** Número da nota; null no resumo do gasto salvo, que não traz o número. */
  number: number | null;
  itemCount: number;
  amountDue: string;
}

/** @example initialInvoiceDraft(null) // { kind: 'none' } */
export function initialInvoiceDraft(editing: Expense | null): InvoiceDraft {
  if (!editing?.invoice) return { kind: 'none' };
  return { kind: 'kept', summary: editing.invoice };
}

/**
 * Campo da nota no pedido: ausente mantém a nota salva, null tira, texto lê de novo e prende.
 *
 * @example invoiceCodeField({ kind: 'removed' }) // { invoiceCode: null }
 */
export function invoiceCodeField(
  draft: InvoiceDraft,
): Pick<ExpenseInput, 'invoiceCode'> {
  if (draft.kind === 'read') return { invoiceCode: draft.code };
  if (draft.kind === 'removed') return { invoiceCode: null };
  return {};
}

/** "Tirar nota": no gasto salvo com nota, manda tirar; senão, só some a nota lida. */
export function withoutInvoice(editing: Expense | null): InvoiceDraft {
  return editing?.invoice ? { kind: 'removed' } : { kind: 'none' };
}

/**
 * Preenche o gasto com a nota lida: o Valor sempre recebe o "a pagar" (o caixa ainda pode
 * mudar); Tipo e Observação só se estiverem vazios, com a sugestão do último gasto do mesmo
 * mercado ou, sem ela, o nome do mercado na observação.
 *
 * @example fillFromInvoice(EMPTY_EXPENSE_FORM, preview, types).amount // '447,26'
 */
export function fillFromInvoice(
  values: ExpenseFormValues,
  preview: InvoicePreview,
  types: ExpenseType[],
): ExpenseFormValues {
  const { suggestion, vendorName } = preview;
  const suggestedType = types.find(
    (type) => type.active && type.id === suggestion?.expenseTypeId,
  );
  const description = suggestion?.description ?? vendorName;
  return {
    typeName: values.typeName.trim()
      ? values.typeName
      : (suggestedType?.name ?? ''),
    amount: typedMoney(preview.invoice.amountDue),
    description: values.description.trim() ? values.description : description,
  };
}

/** @example invoiceCardOf({ kind: 'none' }) // null */
export function invoiceCardOf(draft: InvoiceDraft): InvoiceCard | null {
  if (draft.kind === 'kept') return { ...draft.summary, number: null };
  if (draft.kind !== 'read') return null;
  const { invoice, vendorName } = draft.preview;
  return {
    vendorName,
    issuedAt: invoice.issuedAt,
    number: invoice.number,
    itemCount: invoice.items.length,
    amountDue: invoice.amountDue,
  };
}
