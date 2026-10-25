import { UnprocessableEntityException } from '@nestjs/common';
import {
  CONSUMER_CPF,
  nfceErrorPageHtml,
  nfcePageHtml,
  SAMPLE_PAGE,
} from './nfce-page.fixture.js';
import { parseNfcePage } from './nfce-page-parser.js';

describe('parseNfcePage', () => {
  const page = parseNfcePage(nfcePageHtml(SAMPLE_PAGE));

  it('lê o mercado com o CNPJ só em números', () => {
    expect(page.issuerName).toBe('MERCADO EXEMPLO & FILHOS LTDA');
    expect(page.issuerCnpj).toBe('11222333000181');
  });

  it('lê número, série e a emissão no horário de SP', () => {
    expect(page.number).toBe(1234);
    expect(page.series).toBe(12);
    expect(page.issuedAt.toISOString()).toBe('2026-10-18T20:14:11.000Z');
  });

  it('lê cada item como está na nota, com vírgula, milhar e kg', () => {
    expect(page.items).toEqual([
      {
        position: 1,
        code: '1001',
        description: 'BACON EXEMPLO kg',
        quantity: '1.234',
        unit: 'KG',
        unitPrice: '39.9',
        total: '49.24',
      },
      {
        position: 2,
        code: '7890000000017',
        description: 'REF COLA 350ML',
        quantity: '12',
        unit: 'UN',
        unitPrice: '3.49',
        total: '41.88',
      },
      {
        position: 3,
        code: '2002',
        description: 'CAIXA TERMICA 50L',
        quantity: '1',
        unit: 'UN',
        unitPrice: '1234.5',
        total: '1234.50',
      },
    ]);
  });

  it('lê total dos itens, desconto e o valor a pagar', () => {
    expect(page).toMatchObject({
      itemsTotal: '1325.62',
      discount: '5.62',
      amountDue: '1320.00',
    });
  });

  it('nota sem a linha de desconto fica com desconto zero', () => {
    const html = nfcePageHtml({
      ...SAMPLE_PAGE,
      discount: null,
      amountDue: '1.325,62',
    });
    expect(parseNfcePage(html).discount).toBe('0.00');
  });

  // Nota real de 2026-10-24 (1 item, sem desconto) veio sem "Valor total" e dava 422.
  it('nota sem a linha "Valor total" usa o valor a pagar mais o desconto', () => {
    const noDiscount = { ...SAMPLE_PAGE, itemsTotal: null, discount: null };
    const html = nfcePageHtml({ ...noDiscount, amountDue: '1.325,62' });
    expect(parseNfcePage(html).itemsTotal).toBe('1325.62');
    const withDiscount = nfcePageHtml({ ...SAMPLE_PAGE, itemsTotal: null });
    expect(parseNfcePage(withDiscount).itemsTotal).toBe('1325.62');
  });

  it('junta as formas de pagamento e deixa o troco de fora', () => {
    expect(page.paymentLabel).toBe('Cartão de Crédito + Dinheiro');
  });

  it('nota sem forma de pagamento fica sem rótulo', () => {
    const html = nfcePageHtml({ ...SAMPLE_PAGE, payments: [] });
    expect(parseNfcePage(html).paymentLabel).toBeNull();
  });

  it('nunca leva o CPF do consumidor', () => {
    const digits = CONSUMER_CPF.replace(/\D/g, '');
    const serialized = JSON.stringify(page);
    expect(serialized).not.toContain(CONSUMER_CPF);
    expect(serialized).not.toContain(digits);
  });

  it('recusa a nota cancelada pelo mercado', () => {
    const html = nfcePageHtml({ ...SAMPLE_PAGE, status: 'canceled' });
    expect(() => parseNfcePage(html)).toThrow(/cancelada/);
  });

  it('recusa a nota denegada', () => {
    const html = nfcePageHtml({ ...SAMPLE_PAGE, status: 'denied' });
    expect(() => parseNfcePage(html)).toThrow(/denegada/);
  });

  it('repassa o erro que a SEFAZ mostrou, sem as marcas do HTML', () => {
    const html = nfceErrorPageHtml(
      'Problemas na consulta via QR Code – QR Code inválido. Erro(s): </br>- Dígito verificador Chave de Acesso do QR Code inválido',
    );
    expect(() => parseNfcePage(html)).toThrow(
      'A SEFAZ não achou a nota: Problemas na consulta via QR Code – QR Code inválido. Erro(s): - Dígito verificador Chave de Acesso do QR Code inválido',
    );
  });

  it('página sem itens e sem mensagem vira 422 com aviso genérico', () => {
    expect(() => parseNfcePage(nfceErrorPageHtml(null))).toThrow(
      UnprocessableEntityException,
    );
  });

  it('valor fora do formato da SEFAZ diz o que veio e o que esperava', () => {
    const html = nfcePageHtml({
      ...SAMPLE_PAGE,
      items: [{ ...SAMPLE_PAGE.items[0], total: '49.24' }],
    });
    expect(() => parseNfcePage(html)).toThrow(/"49\.24".*1\.234,56/);
  });
});
