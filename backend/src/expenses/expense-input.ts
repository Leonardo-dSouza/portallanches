import { parseId, parseObject, parseText } from '../common/input-parsers.js';
import { parseMoney } from '../common/money.js';

const MAX_DESCRIPTION_LENGTH = 200;
// O link do QR Code da NFC-e tem ~150 caracteres; a folga cobre o formato v2 com hash.
const MAX_INVOICE_CODE_LENGTH = 500;

/** Corpo de gasto já validado. */
export interface ExpenseInput {
  expenseTypeId: number;
  /** Observação opcional (ex.: nome do freelancer); null quando ausente. */
  description: string | null;
  amount: string;
  /** Nota fiscal (link ou chave): texto = ler e prender; null = tirar; ausente = manter. */
  invoiceCode?: string | null;
}

/** Pedido de prévia da nota; `expenseId` é o gasto em edição (a nota dele não conta como repetida). */
export interface InvoicePreviewInput {
  code: string;
  expenseId: number | null;
}

const isAbsent = (value: unknown): boolean =>
  value === undefined || value === null;

/**
 * Valida o corpo de um gasto vindo da API.
 *
 * @example parseExpenseInput({ expenseTypeId: 1, amount: 120 })
 */
export function parseExpenseInput(body: unknown): ExpenseInput {
  const fields = parseObject(body, 'gasto');
  return {
    expenseTypeId: parseId(fields.expenseTypeId, 'expenseTypeId'),
    description: isAbsent(fields.description)
      ? null
      : parseText(fields.description, 'description', MAX_DESCRIPTION_LENGTH),
    amount: parseMoney(fields.amount, 'amount', false),
    invoiceCode: parseInvoiceCode(fields.invoiceCode),
  };
}

function parseInvoiceCode(raw: unknown): string | null | undefined {
  if (raw === undefined || raw === null) return raw;
  return parseText(raw, 'invoiceCode', MAX_INVOICE_CODE_LENGTH);
}

/**
 * Valida o pedido de prévia da nota fiscal.
 *
 * @example parseInvoicePreviewInput({ code: 'https://…/qrcode?p=3526…' })
 */
export function parseInvoicePreviewInput(body: unknown): InvoicePreviewInput {
  const fields = parseObject(body, 'prévia da nota fiscal');
  return {
    code: parseText(fields.code, 'code', MAX_INVOICE_CODE_LENGTH),
    expenseId: isAbsent(fields.expenseId)
      ? null
      : parseId(fields.expenseId, 'expenseId'),
  };
}
