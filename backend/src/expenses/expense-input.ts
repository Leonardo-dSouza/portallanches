import { BadRequestException } from '@nestjs/common';
import {
  parseId,
  parseObject,
  parsePositionList,
  parseText,
} from '../common/input-parsers.js';
import { parseMoney } from '../common/money.js';

const MAX_DESCRIPTION_LENGTH = 200;
// O link do QR Code da NFC-e tem ~150 caracteres; a folga cobre o formato v2 com hash.
const MAX_INVOICE_CODE_LENGTH = 500;
// A página da nota tem ~10 KB; 50+ itens ou o "Página completa" do navegador cabem com folga.
const MAX_INVOICE_PAGE_LENGTH = 2_000_000;

/** Corpo de gasto já validado. */
export interface ExpenseInput {
  expenseTypeId: number;
  /** Observação opcional (ex.: nome do freelancer); null quando ausente. */
  description: string | null;
  amount: string;
  /** Nota fiscal (link ou chave): texto = ler e prender; null = tirar; ausente = manter. */
  invoiceCode?: string | null;
  /** HTML salvo da nota (vem com `invoiceCode`): lê dele, sem consultar a SEFAZ. */
  invoicePage?: string;
  /** Itens da nota fora da lanchonete (2026-10-25): lista = trocar as marcas; ausente = manter. */
  outsidePositions?: number[];
}

/** De onde vem a nota: consulta pelo código ou HTML salvo no navegador. */
export type InvoiceSource =
  | { kind: 'code'; code: string }
  /** `expectedCode`: ao salvar, o arquivo tem de ser o da nota da prévia. */
  | { kind: 'page'; html: string; expectedCode: string | null };

/** Pedido de prévia da nota; `expenseId` é o gasto em edição (a nota dele não conta como repetida). */
export interface InvoicePreviewInput {
  source: InvoiceSource;
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
  const invoiceCode = parseInvoiceCode(fields.invoiceCode);
  return {
    expenseTypeId: parseId(fields.expenseTypeId, 'expenseTypeId'),
    description: isAbsent(fields.description)
      ? null
      : parseText(fields.description, 'description', MAX_DESCRIPTION_LENGTH),
    amount: parseMoney(fields.amount, 'amount', false),
    invoiceCode,
    invoicePage: parseAttachedPage(fields.invoicePage, invoiceCode),
    outsidePositions:
      fields.outsidePositions === undefined
        ? undefined
        : parsePositionList(fields.outsidePositions, 'outsidePositions'),
  };
}

function parseInvoiceCode(raw: unknown): string | null | undefined {
  if (raw === undefined || raw === null) return raw;
  return parseText(raw, 'invoiceCode', MAX_INVOICE_CODE_LENGTH);
}

/** O HTML traz o CPF do consumidor: o erro diz o tamanho, nunca o conteúdo. */
function parsePageText(raw: unknown, field: string): string {
  if (typeof raw !== 'string' || raw.trim() === '')
    throw new BadRequestException(
      `Campo "${field}" inválido: esperado o HTML da nota`,
    );
  if (raw.length <= MAX_INVOICE_PAGE_LENGTH) return raw;
  throw new BadRequestException(
    `Campo "${field}" inválido: recebido ${raw.length} caracteres, esperado até ${MAX_INVOICE_PAGE_LENGTH}`,
  );
}

function parseAttachedPage(
  raw: unknown,
  invoiceCode: string | null | undefined,
): string | undefined {
  if (raw === undefined) return undefined;
  const page = parsePageText(raw, 'invoicePage');
  if (invoiceCode) return page;
  throw new BadRequestException(
    'Campo "invoicePage" inválido: esperado junto de "invoiceCode"',
  );
}

function parseInvoiceSource(fields: Record<string, unknown>): InvoiceSource {
  const hasPage = !isAbsent(fields.savedPage);
  if (hasPage && !isAbsent(fields.code))
    throw new BadRequestException(
      'Prévia da nota inválida: esperado um dos dois, "code" ou "savedPage"',
    );
  if (hasPage)
    return {
      kind: 'page',
      html: parsePageText(fields.savedPage, 'savedPage'),
      expectedCode: null,
    };
  return {
    kind: 'code',
    code: parseText(fields.code, 'code', MAX_INVOICE_CODE_LENGTH),
  };
}

/**
 * Valida o pedido de prévia da nota fiscal: o link ou a chave, ou o HTML salvo.
 *
 * @example parseInvoicePreviewInput({ code: 'https://…/qrcode?p=3526…' })
 */
export function parseInvoicePreviewInput(body: unknown): InvoicePreviewInput {
  const fields = parseObject(body, 'prévia da nota fiscal');
  return {
    source: parseInvoiceSource(fields),
    expenseId: isAbsent(fields.expenseId)
      ? null
      : parseId(fields.expenseId, 'expenseId'),
  };
}
