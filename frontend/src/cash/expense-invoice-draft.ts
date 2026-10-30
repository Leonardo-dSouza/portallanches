import type {
  ExpenseInvoiceSummary,
  InvoicePreview,
} from '../api/invoice-types';
import {
  centsToMoney,
  formatMoney,
  moneyToCents,
  toApiMoney,
} from '../api/money';
import type { Expense, ExpenseInput, ExpenseType } from '../api/types';
import {
  businessAmountOf,
  outsideMarksOf,
  type OutsideMarks,
} from '../purchases/outside-items';
import type { ExpenseFormValues } from './expense-form-values';
import { typedMoney } from './order-form-values';

/**
 * A nota no formulário de gasto: nenhuma, a do gasto em edição (mantida), uma lida agora na
 * SEFAZ ou a do gasto tirada pelo caixa. As marcas de fora (2026-10-25) vêm com a nota lida
 * (o "lembrar" da prévia); na mantida, null = as gravadas, até o caixa mexer.
 */
export type InvoiceDraft =
  | { kind: 'none' }
  | {
      kind: 'kept';
      summary: ExpenseInvoiceSummary;
      outside: OutsideMarks | null;
    }
  | {
      kind: 'read';
      code: string;
      preview: InvoicePreview;
      outside: OutsideMarks;
      /** HTML importado: vai de novo ao salvar, porque o servidor não o guarda. */
      savedPage: string | null;
    }
  | { kind: 'removed' };

/** O que o cartão da nota mostra no formulário. */
export interface InvoiceCard {
  vendorName: string;
  issuedAt: string;
  /** Número da nota; null no resumo do gasto salvo, que não traz o número. */
  number: number | null;
  itemCount: number;
  amountDue: string;
  /** Itens fora da lanchonete e a soma deles. */
  outsideCount: number;
  outsideTotal: string;
}

/** @example initialInvoiceDraft(null) // { kind: 'none' } */
export function initialInvoiceDraft(editing: Expense | null): InvoiceDraft {
  if (!editing?.invoice) return { kind: 'none' };
  return { kind: 'kept', summary: editing.invoice, outside: null };
}

/** Nota lida agora, já com o que o mercado teve de fora da última vez. */
export function readInvoiceDraft(
  code: string,
  preview: InvoicePreview,
  savedPage: string | null = null,
): InvoiceDraft {
  const outside = outsideMarksOf(
    preview.invoice.items,
    preview.outsidePositions,
  );
  return { kind: 'read', code, preview, outside, savedPage };
}

const MAX_INVOICE_FILE_BYTES = 2_000_000;
const HTML_FILE = /\.html?$/i;

/**
 * O que impede de importar o arquivo; null = pode ler.
 *
 * @example invoiceFileProblem(pdf) // '"nota.pdf" não é HTML: esperado o arquivo .html…'
 */
export function invoiceFileProblem(file: File): string | null {
  if (!HTML_FILE.test(file.name))
    return `"${file.name}" não é HTML: esperado o arquivo .html da nota, salvo com Ctrl+S`;
  if (file.size > MAX_INVOICE_FILE_BYTES)
    return `"${file.name}" tem ${file.size} bytes: esperado até ${MAX_INVOICE_FILE_BYTES}`;
  return null;
}

/** As marcas novas na nota lida ou mantida; sem nota, nada muda. */
export function withOutsideMarks(
  draft: InvoiceDraft,
  outside: OutsideMarks,
): InvoiceDraft {
  if (draft.kind === 'read' || draft.kind === 'kept')
    return { ...draft, outside };
  return draft;
}

/**
 * Campos da nota no pedido: ausente mantém a nota salva, null tira, texto lê de novo e prende;
 * as marcas de fora vão com a nota lida e com a mantida depois que o caixa mexeu.
 *
 * @example invoiceFields({ kind: 'removed' }) // { invoiceCode: null }
 */
export function invoiceFields(
  draft: InvoiceDraft,
): Pick<ExpenseInput, 'invoiceCode' | 'invoicePage' | 'outsidePositions'> {
  if (draft.kind === 'read')
    return {
      invoiceCode: draft.code,
      ...(draft.savedPage === null ? {} : { invoicePage: draft.savedPage }),
      outsidePositions: draft.outside.positions,
    };
  if (draft.kind === 'removed') return { invoiceCode: null };
  if (draft.kind === 'kept' && draft.outside)
    return { outsidePositions: draft.outside.positions };
  return {};
}

/** "Tirar nota": no gasto salvo com nota, manda tirar; senão, só some a nota lida. */
export function withoutInvoice(editing: Expense | null): InvoiceDraft {
  return editing?.invoice ? { kind: 'removed' } : { kind: 'none' };
}

/**
 * Preenche o gasto com a nota lida: o Valor sempre recebe o "a pagar" menos o que já veio
 * marcado de fora (o caixa ainda pode mudar); Tipo e Observação só se estiverem vazios, com a
 * sugestão do último gasto do mesmo mercado ou, sem ela, o nome do mercado na observação.
 *
 * @example fillFromInvoice(EMPTY_EXPENSE_FORM, preview, types).amount // '447,26'
 */
export function fillFromInvoice(
  values: ExpenseFormValues,
  preview: InvoicePreview,
  types: ExpenseType[],
): ExpenseFormValues {
  const { suggestion, vendorName, invoice } = preview;
  const suggestedType = types.find(
    (type) => type.active && type.id === suggestion?.expenseTypeId,
  );
  const description = suggestion?.description ?? vendorName;
  const outside = outsideMarksOf(invoice.items, preview.outsidePositions);
  return {
    typeName: values.typeName.trim()
      ? values.typeName
      : (suggestedType?.name ?? ''),
    amount: typedMoney(businessAmountOf(invoice.amountDue, outside.cents)),
    description: values.description.trim() ? values.description : description,
  };
}

/** Soma das linhas de fora agora (na mantida sem mexer, a gravada). */
export function outsideCentsOf(draft: InvoiceDraft): number {
  if (draft.kind === 'read') return draft.outside.cents;
  if (draft.kind !== 'kept') return 0;
  return draft.outside?.cents ?? moneyToCents(draft.summary.outsideTotal);
}

/** @example invoiceCardOf({ kind: 'none' }) // null */
export function invoiceCardOf(draft: InvoiceDraft): InvoiceCard | null {
  if (draft.kind === 'kept') return keptCard(draft.summary, draft.outside);
  if (draft.kind !== 'read') return null;
  const { invoice, vendorName } = draft.preview;
  return {
    vendorName,
    issuedAt: invoice.issuedAt,
    number: invoice.number,
    itemCount: invoice.items.length,
    amountDue: invoice.amountDue,
    outsideCount: draft.outside.positions.length,
    outsideTotal: centsToMoney(draft.outside.cents),
  };
}

function keptCard(
  summary: ExpenseInvoiceSummary,
  outside: OutsideMarks | null,
): InvoiceCard {
  const { outsideItemCount, outsideTotal, ...card } = summary;
  return {
    ...card,
    number: null,
    outsideCount: outside?.positions.length ?? outsideItemCount,
    outsideTotal: outside ? centsToMoney(outside.cents) : outsideTotal,
  };
}

/**
 * A dica embaixo do Valor: o "a pagar" da nota e, com itens de fora, quanto saiu; nada quando o
 * Valor é a nota inteira, sem itens de fora.
 *
 * @example amountHint(card, '432,59') // 'Nota: R$ 447,26 · fora da lanchonete: R$ 14,67'
 */
export function amountHint(
  card: InvoiceCard,
  typedAmount: string,
): string | null {
  const note = `Nota: ${formatMoney(card.amountDue)}`;
  if (card.outsideCount > 0)
    return `${note} · fora da lanchonete: ${formatMoney(card.outsideTotal)}`;
  return toApiMoney(typedAmount) === card.amountDue ? null : note;
}
