import { UnprocessableEntityException } from '@nestjs/common';
import type { NfceItem, NfcePage } from './nfce-invoice.js';
import { parseNfceHtml, type NfceHtmlNode } from './nfce-html-document.js';

// Formato brasileiro da página: milhar com ponto e decimal com vírgula ("1.234,56", "3,107").
const BR_NUMBER = /^(\d{1,3}(\.\d{3})+|\d+)(,\d+)?$/;
const GENERAL_INFO =
  /Número:\s*(\d+)\s*Série:\s*(\d+)\s*Emissão:\s*(\d{2})\/(\d{2})\/(\d{4}) (\d{2}:\d{2}:\d{2})/;
// SP não tem horário de verão desde 2019 (Decreto 9.772): a emissão da nota é sempre -03:00.
const SAO_PAULO_OFFSET = '-03:00';
const SEFAZ_ERROR = /spnErro\w*'\)\.html\('([\s\S]*?)'\)/;

/**
 * Lê a página da consulta pública da NFC-e (SEFAZ-SP, XSLT 2.05). Nota cancelada, denegada ou
 * não achada, e página fora do formato, viram 422 com o motivo.
 *
 * @example parseNfcePage(html).amountDue // '447.26'
 */
export function parseNfcePage(html: string): NfcePage {
  const root = parseNfceHtml(html);
  assertReadableInvoice(root, html);
  return {
    ...readIssuer(root),
    ...readGeneralInfo(root),
    ...readTotals(root),
    paymentLabel: readPaymentLabel(root),
    items: root.findAll('#tabResult tr[id^="Item"]').map(readItem),
  };
}

function assertReadableInvoice(root: NfceHtmlNode, html: string): void {
  if (root.find('#hdfNotaCancelada'))
    throw new UnprocessableEntityException(
      'Essa nota foi cancelada pelo mercado: não dá para lançar o gasto por ela',
    );
  if (root.find('#hdfNotaDenegada'))
    throw new UnprocessableEntityException(
      'Essa nota foi denegada pela SEFAZ: não dá para lançar o gasto por ela',
    );
  if (!root.find('#tabResult'))
    throw new UnprocessableEntityException(
      `A SEFAZ não achou a nota: ${sefazMessage(html) ?? 'confira o link ou a chave'}`,
    );
}

/** A página de erro escreve a mensagem por script (`$('#spnErro…').html('…')`). */
function sefazMessage(html: string): string | null {
  const match = SEFAZ_ERROR.exec(html);
  if (!match) return null;
  const text = match[1]
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text || null;
}

function readIssuer(
  root: NfceHtmlNode,
): Pick<NfcePage, 'issuerName' | 'issuerCnpj'> {
  const cnpjLine = root
    .findAll('.txtCenter .text')
    .find((line) => line.text.includes('CNPJ'));
  const issuerCnpj = (cnpjLine?.text ?? '').replace(/\D/g, '');
  if (issuerCnpj.length !== 14)
    throw pageChanged('CNPJ', cnpjLine?.text ?? null, 'CNPJ com 14 números');
  return { issuerName: requiredText(root, '#u20'), issuerCnpj };
}

function readGeneralInfo(
  root: NfceHtmlNode,
): Pick<NfcePage, 'number' | 'series' | 'issuedAt'> {
  const info = root
    .findAll('#infos li')
    .find((li) => li.text.includes('Número:'));
  const match = GENERAL_INFO.exec(info?.text ?? '');
  if (!match)
    throw pageChanged(
      'Informações gerais',
      info?.text ?? null,
      'Número, Série e Emissão',
    );
  const [, number, series, day, month, year, time] = match;
  return {
    number: Number(number),
    series: Number(series),
    issuedAt: new Date(`${year}-${month}-${day}T${time}${SAO_PAULO_OFFSET}`),
  };
}

function readTotals(
  root: NfceHtmlNode,
): Pick<NfcePage, 'itemsTotal' | 'discount' | 'amountDue'> {
  const lines = new Map(
    root
      .findAll('#totalNota div')
      .map((line) => [
        line.find('label')?.text ?? '',
        line.find('.totalNumb')?.text ?? '',
      ]),
  );
  const total = (label: string): string | undefined => lines.get(label);
  return {
    itemsTotal: brMoney(total('Valor total R$:'), 'Valor total'),
    discount: brMoney(total('Descontos R$:') ?? '0', 'Descontos'),
    amountDue: brMoney(total('Valor a pagar R$:'), 'Valor a pagar'),
  };
}

function readPaymentLabel(root: NfceHtmlNode): string | null {
  const methods = root
    .findAll('#totalNota label.tx')
    .map((label) => label.text)
    .filter((label) => label && !label.startsWith('Troco'));
  return methods.length > 0 ? methods.join(' + ') : null;
}

function readItem(row: NfceHtmlNode, index: number): NfceItem {
  const code = /Código:\s*(.*?)\s*\)/.exec(requiredText(row, '.RCod'));
  if (!code?.[1]) throw pageChanged('Código', row.text, '(Código: 123)');
  return {
    position: index + 1,
    code: code[1],
    description: requiredText(row, 'span.txtTit'),
    quantity: brDecimal(afterLabel(row, '.Rqtd'), 'Qtde.'),
    unit: afterLabel(row, '.RUN'),
    unitPrice: brDecimal(afterLabel(row, '.RvlUnit'), 'Vl. Unit.'),
    total: brMoney(requiredText(row, '.valor'), 'Vl. Total'),
  };
}

/** Texto depois do rótulo em negrito ("Qtde.:3,107" → "3,107"). */
function afterLabel(row: NfceHtmlNode, selector: string): string {
  const text = requiredText(row, selector);
  return text.slice(text.lastIndexOf(':') + 1).trim();
}

function requiredText(node: NfceHtmlNode, selector: string): string {
  const text = node.find(selector)?.text;
  if (!text) throw pageChanged(selector, null, 'o campo preenchido');
  return text;
}

/** "1.234,5" → "1234.5" (sem float); recusa o que não estiver no formato da página. */
function brDecimal(raw: string | undefined, field: string): string {
  if (raw === undefined || !BR_NUMBER.test(raw))
    throw pageChanged(field, raw ?? null, 'número como 1.234,56');
  const [integerPart, decimals = ''] = raw.replace(/\./g, '').split(',');
  const trimmed = decimals.replace(/0+$/, '');
  return `${Number(integerPart)}${trimmed ? `.${trimmed}` : ''}`;
}

/** Valor em reais com 2 casas ("1.234,5" → "1234.50"). */
function brMoney(raw: string | undefined, field: string): string {
  const [integerPart, decimals = ''] = brDecimal(raw, field).split('.');
  if (decimals.length > 2)
    throw pageChanged(
      field,
      raw ?? null,
      'valor com até 2 casas, como 1.234,56',
    );
  return `${integerPart}.${decimals.padEnd(2, '0')}`;
}

function pageChanged(
  field: string,
  raw: string | null,
  expected: string,
): UnprocessableEntityException {
  return new UnprocessableEntityException(
    `A página da SEFAZ mudou: "${field}" veio ${JSON.stringify(raw)}, esperado ${expected}`,
  );
}
