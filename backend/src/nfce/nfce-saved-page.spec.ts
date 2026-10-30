import {
  BadRequestException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  CONSUMER_CPF,
  nfcePageHtml,
  SAMPLE_PAGE,
  SAVED_PAGE,
} from './nfce-page.fixture.js';
import { readSavedNfcePage } from './nfce-saved-page.js';

const KEY = '35261011222333000181650010000012341123456780';
const REJECTED_PAGE =
  '<html><head><title>Request Rejected</title></head></html>';

describe('readSavedNfcePage', () => {
  it('lê a nota e a chave da própria página', () => {
    const invoice = readSavedNfcePage(nfcePageHtml(SAVED_PAGE));
    expect(invoice).toMatchObject({
      accessKey: KEY,
      issuerCnpj: '11222333000181',
      series: 1,
      number: 1234,
      amountDue: '1320.00',
    });
  });

  it('lê nota de 60 itens (o motivo da importação: à mão não dá)', () => {
    const item = SAVED_PAGE.items[0];
    const items = Array.from({ length: 60 }, () => item);
    const invoice = readSavedNfcePage(nfcePageHtml({ ...SAVED_PAGE, items }));
    expect(invoice.items).toHaveLength(60);
    expect(invoice.items[59].position).toBe(60);
  });

  it('nunca leva o CPF do consumidor', () => {
    const invoice = readSavedNfcePage(nfcePageHtml(SAVED_PAGE));
    expect(JSON.stringify(invoice)).not.toContain(CONSUMER_CPF);
  });

  it('recusa página cuja nota não bate com a chave, dizendo o quê', () => {
    expect(() =>
      readSavedNfcePage(nfcePageHtml({ ...SAVED_PAGE, number: '999' })),
    ).toThrow(/número 999, esperado 1234/);
  });

  it('recusa a amostra com série diferente da chave', () => {
    expect(() => readSavedNfcePage(nfcePageHtml(SAMPLE_PAGE))).toThrow(
      /série 12, esperado 1/,
    );
  });

  it('nota cancelada continua barrada', () => {
    const canceled = nfcePageHtml({ ...SAVED_PAGE, status: 'canceled' });
    expect(() => readSavedNfcePage(canceled)).toThrow(/cancelada/);
  });

  it('arquivo que não é a nota (ex.: a recusa do firewall) vira 422 com a saída', () => {
    expect(() => readSavedNfcePage(REJECTED_PAGE)).toThrow(
      UnprocessableEntityException,
    );
    expect(() => readSavedNfcePage(REJECTED_PAGE)).toThrow(
      /não é a página da nota/,
    );
  });

  it('página sem a chave vira 422', () => {
    const html = nfcePageHtml(SAVED_PAGE).replace('class="chave"', 'class="x"');
    expect(() => readSavedNfcePage(html)).toThrow(/não é a página da nota/);
  });

  it('chave com dígito verificador errado é recusada', () => {
    const accessKey = SAVED_PAGE.accessKey.replace(/0$/, '1');
    expect(() =>
      readSavedNfcePage(nfcePageHtml({ ...SAVED_PAGE, accessKey })),
    ).toThrow(BadRequestException);
  });
});
