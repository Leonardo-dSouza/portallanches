import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { FakeNfcePageSource } from '../nfce/nfce-fakes.fixture.js';
import { nfcePageHtml, SAMPLE_PAGE } from '../nfce/nfce-page.fixture.js';
import { parseNfcePage } from '../nfce/nfce-page-parser.js';
import {
  ADMIN,
  buildInvoiceReader,
  CAIXA,
  FakeClosingLookup,
  FakeExpenseRepository,
  TODAY_CLOSING_ID,
} from './expense-fakes.fixture.js';
import { ExpenseInvoiceService } from './expense-invoice.service.js';

const KEY = '35261011222333000181650010000012341123456780';
const OTHER_KEY = '35261011222333000181650010000098761123456789';
const CNPJ_ROOT = '11222333';

function build() {
  const repo = new FakeExpenseRepository();
  const pages = new FakeNfcePageSource()
    .serve(KEY, nfcePageHtml(SAMPLE_PAGE))
    .serve(OTHER_KEY, nfcePageHtml(SAMPLE_PAGE));
  const service = new ExpenseInvoiceService(
    buildInvoiceReader(repo, pages),
    repo,
    new FakeClosingLookup(),
  );
  return { service, repo };
}

/** Gasto com nota gravado direto no fake (a nota lida da página de exemplo). */
async function seedExpense(
  repo: FakeExpenseRepository,
  closingId: number,
  accessKey: string,
) {
  const invoice = { accessKey, ...parseNfcePage(nfcePageHtml(SAMPLE_PAGE)) };
  const data = {
    expenseTypeId: 3,
    description: 'Bacon e refri',
    amount: '1300.00',
  };
  return repo.create(closingId, 1, data, { invoice, outsidePositions: [] });
}

describe('ExpenseInvoiceService.preview', () => {
  it('mostra a nota e o mercado pela razão social quando é novo', async () => {
    const preview = await build().service.preview({ code: KEY });
    expect(preview.invoice.accessKey).toBe(KEY);
    expect(preview.invoice.items).toHaveLength(3);
    expect(preview.vendorName).toBe('MERCADO EXEMPLO & FILHOS LTDA');
    expect(preview.suggestion).toBeNull();
  });

  it('usa o apelido do mercado e sugere tipo e observação do último gasto dele', async () => {
    const { service, repo } = build();
    repo.nicknames.set(CNPJ_ROOT, 'Exemplo');
    await seedExpense(repo, TODAY_CLOSING_ID, KEY);
    const preview = await service.preview({ code: OTHER_KEY });
    expect(preview.vendorName).toBe('Exemplo');
    expect(preview.suggestion).toEqual({
      expenseTypeId: 3,
      description: 'Bacon e refri',
    });
  });

  it('nota já usada vira 409', async () => {
    const { service, repo } = build();
    await seedExpense(repo, TODAY_CLOSING_ID, KEY);
    await expect(service.preview({ code: KEY })).rejects.toThrow(
      ConflictException,
    );
  });

  it('a nota do próprio gasto em edição não conta como repetida', async () => {
    const { service, repo } = build();
    const expense = await seedExpense(repo, TODAY_CLOSING_ID, KEY);
    const preview = await service.preview({ code: KEY, expenseId: expense.id });
    expect(preview.invoice.accessKey).toBe(KEY);
  });
});

describe('ExpenseInvoiceService.detail', () => {
  it('devolve a nota com os itens e o valor lançado no gasto', async () => {
    const { service, repo } = build();
    const expense = await seedExpense(repo, TODAY_CLOSING_ID, KEY);
    const detail = await service.detail(CAIXA, expense.invoice?.id ?? 0);
    expect(detail).toMatchObject({
      accessKey: KEY,
      expenseId: expense.id,
      expenseAmount: '1300.00',
      amountDue: '1320.00',
    });
    expect(detail.items).toHaveLength(3);
  });

  it('caixa não vê a nota de um gasto de outra noite; admin vê', async () => {
    const { service, repo } = build();
    const old = await seedExpense(repo, 5, KEY);
    const invoiceId = old.invoice?.id ?? 0;
    await expect(service.detail(CAIXA, invoiceId)).rejects.toThrow(
      ForbiddenException,
    );
    await expect(service.detail(ADMIN, invoiceId)).resolves.toMatchObject({
      expenseId: old.id,
    });
  });

  it('nota inexistente vira 404 com o id', async () => {
    await expect(build().service.detail(ADMIN, 999)).rejects.toThrow(
      new NotFoundException('Nota fiscal 999 não encontrada'),
    );
  });
});
