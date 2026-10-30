import { UnprocessableEntityException } from '@nestjs/common';
import { keyFieldsOf, parseNfceCode } from './nfce-access-key.js';
import { parseNfceHtml, type NfceHtmlNode } from './nfce-html-document.js';
import type { NfceInvoice, NfcePage } from './nfce-invoice.js';
import { parseNfcePage } from './nfce-page-parser.js';

// O que só a página da nota tem (a cancelada e a denegada trazem a marca delas).
const INVOICE_MARKS = ['#tabResult', '#hdfNotaCancelada', '#hdfNotaDenegada'];

function notInvoicePage(): UnprocessableEntityException {
  return new UnprocessableEntityException(
    'Esse arquivo não é a página da nota: abra a nota na SEFAZ e salve com Ctrl+S',
  );
}

function assertPageOfKey(accessKey: string, page: NfcePage): void {
  const key = keyFieldsOf(accessKey);
  const differ = (field: string, found: unknown, expected: unknown) =>
    new UnprocessableEntityException(
      `A página não bate com a chave ${accessKey}: ${field} ${String(found)}, esperado ${String(expected)}`,
    );
  if (page.issuerCnpj !== key.issuerCnpj)
    throw differ('CNPJ', page.issuerCnpj, key.issuerCnpj);
  if (page.series !== key.series)
    throw differ('série', page.series, key.series);
  if (page.number !== key.number)
    throw differ('número', page.number, key.number);
}

function accessKeyOf(root: NfceHtmlNode): string {
  const printed = root.find('.chave')?.text;
  if (!printed) throw notInvoicePage();
  return parseNfceCode(printed).accessKey;
}

/**
 * Lê a nota do HTML salvo no navegador: a chave vem da própria página e tem de bater com o CNPJ,
 * a série e o número dela. Nota cancelada ou denegada segue barrada (`parseNfcePage`).
 *
 * @example readSavedNfcePage(html).accessKey // '3526…'
 */
export function readSavedNfcePage(html: string): NfceInvoice {
  const root = parseNfceHtml(html);
  if (!INVOICE_MARKS.some((mark) => root.find(mark))) throw notInvoicePage();
  const page = parseNfcePage(html);
  const accessKey = accessKeyOf(root);
  assertPageOfKey(accessKey, page);
  return { accessKey, ...page };
}
