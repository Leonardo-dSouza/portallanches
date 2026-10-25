import {
  BadRequestException,
  ConflictException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { FakeNfcePageSource } from '../nfce/nfce-fakes.fixture.js';
import { nfcePageHtml, SAMPLE_PAGE } from '../nfce/nfce-page.fixture.js';
import {
  buildInvoiceReader,
  CAIXA,
  FakeClosingLookup,
  FakeExpenseRepository,
  FakeExpenseTypeRepository,
} from './expense-fakes.fixture.js';
import { ExpenseTypeService } from './expense-type.service.js';
import { ExpenseService } from './expense.service.js';

// Chaves sintéticas com o dígito verificador certo (ver nfce-access-key.spec.ts).
const KEY = '35261011222333000181650010000012341123456780';
const OTHER_KEY = '35261011222333000181650010000098761123456789';
const MARKET = { expenseTypeId: 3, amount: 1300 };

function build() {
  const repo = new FakeExpenseRepository();
  const pages = new FakeNfcePageSource()
    .serve(KEY, nfcePageHtml(SAMPLE_PAGE))
    .serve(OTHER_KEY, nfcePageHtml({ ...SAMPLE_PAGE, amountDue: '99,90' }));
  const types = new ExpenseTypeService(new FakeExpenseTypeRepository());
  const service = new ExpenseService(
    repo,
    new FakeClosingLookup(),
    types,
    buildInvoiceReader(repo, pages),
  );
  return { service, repo, pages };
}

describe('ExpenseService com nota fiscal', () => {
  it('lança o gasto pela nota e guarda o valor digitado, não o da nota', async () => {
    const { service } = build();
    const expense = await service.create(CAIXA, {
      ...MARKET,
      invoiceCode: KEY,
    });
    expect(expense.amount).toBe('1300.00');
    expect(expense.invoice).toEqual({
      id: 101,
      vendorName: 'MERCADO EXEMPLO & FILHOS LTDA',
      issuedAt: '2026-10-18T20:14:11.000Z',
      itemCount: 3,
      outsideItemCount: 0,
      outsideTotal: '0.00',
      amountDue: '1320.00',
    });
  });

  it('a mesma nota em outro gasto vira 409 com o gasto e a noite, sem consultar a SEFAZ', async () => {
    const { service, pages } = build();
    await service.create(CAIXA, { ...MARKET, invoiceCode: KEY });
    await expect(
      service.create(CAIXA, { ...MARKET, invoiceCode: KEY }),
    ).rejects.toThrow('Essa nota já está no gasto #1 (noite de 22/09)');
    expect(pages.queries).toHaveLength(1);
  });

  it('409 é ConflictException', async () => {
    const { service } = build();
    await service.create(CAIXA, { ...MARKET, invoiceCode: KEY });
    await expect(
      service.create(CAIXA, { ...MARKET, invoiceCode: KEY }),
    ).rejects.toThrow(ConflictException);
  });

  it('editar sem mandar a nota mantém a nota', async () => {
    const { service } = build();
    const created = await service.create(CAIXA, {
      ...MARKET,
      invoiceCode: KEY,
    });
    const updated = await service.replace(CAIXA, created.id, MARKET);
    expect(updated.invoice?.id).toBe(101);
  });

  it('editar com a nota null tira a nota', async () => {
    const { service, repo } = build();
    const created = await service.create(CAIXA, {
      ...MARKET,
      invoiceCode: KEY,
    });
    const updated = await service.replace(CAIXA, created.id, {
      ...MARKET,
      invoiceCode: null,
    });
    expect(updated.invoice).toBeNull();
    expect(repo.invoices).toEqual([]);
  });

  it('editar com a mesma nota do próprio gasto lê de novo, sem 409', async () => {
    const { service } = build();
    const created = await service.create(CAIXA, {
      ...MARKET,
      invoiceCode: KEY,
    });
    const updated = await service.replace(CAIXA, created.id, {
      ...MARKET,
      invoiceCode: KEY,
    });
    expect(updated.invoice?.amountDue).toBe('1320.00');
  });

  it('editar com outra nota troca a nota', async () => {
    const { service, repo } = build();
    const created = await service.create(CAIXA, {
      ...MARKET,
      invoiceCode: KEY,
    });
    const updated = await service.replace(CAIXA, created.id, {
      ...MARKET,
      invoiceCode: OTHER_KEY,
    });
    expect(updated.invoice?.amountDue).toBe('99.90');
    expect(repo.invoices).toHaveLength(1);
  });

  it('apagar o gasto apaga a nota', async () => {
    const { service, repo } = build();
    const created = await service.create(CAIXA, {
      ...MARKET,
      invoiceCode: KEY,
    });
    await service.remove(CAIXA, created.id);
    expect(repo.invoices).toEqual([]);
  });

  it('código inválido não grava o gasto', async () => {
    const { service, repo } = build();
    await expect(
      service.create(CAIXA, { ...MARKET, invoiceCode: 'abc' }),
    ).rejects.toThrow(BadRequestException);
    expect(repo.records).toEqual([]);
  });

  it('SEFAZ fora do ar não grava o gasto', async () => {
    const { service, repo, pages } = build();
    pages.failWith(new ServiceUnavailableException('fora do ar'));
    await expect(
      service.create(CAIXA, { ...MARKET, invoiceCode: KEY }),
    ).rejects.toThrow(ServiceUnavailableException);
    expect(repo.records).toEqual([]);
  });
});
