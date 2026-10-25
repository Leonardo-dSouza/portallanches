import {
  BadRequestException,
  UnprocessableEntityException,
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
import { ExpenseInvoiceService } from './expense-invoice.service.js';
import { ExpenseTypeService } from './expense-type.service.js';
import { ExpenseService } from './expense.service.js';

// Chaves sintéticas com o dígito verificador certo (ver nfce-access-key.spec.ts). A nota de
// exemplo tem 3 itens: 1 bacon, 2 refri (código 7890000000017) e 3 caixa térmica.
const KEY = '35261011222333000181650010000012341123456780';
const OTHER_KEY = '35261011222333000181650010000098761123456789';
const LATER_KEY = '35261011222333000181650010000055551123456784';
const MARKET = { expenseTypeId: 3, amount: 1278.12 };

function build() {
  const repo = new FakeExpenseRepository();
  const pages = new FakeNfcePageSource()
    .serve(KEY, nfcePageHtml(SAMPLE_PAGE))
    .serve(
      OTHER_KEY,
      nfcePageHtml({ ...SAMPLE_PAGE, issuedAt: '19/10/2026 10:00:00' }),
    )
    .serve(
      LATER_KEY,
      nfcePageHtml({ ...SAMPLE_PAGE, issuedAt: '20/10/2026 10:00:00' }),
    );
  const reader = buildInvoiceReader(repo, pages);
  const closings = new FakeClosingLookup();
  const types = new ExpenseTypeService(new FakeExpenseTypeRepository());
  return {
    expenses: new ExpenseService(repo, closings, types, reader),
    invoices: new ExpenseInvoiceService(reader, repo, closings),
    repo,
  };
}

const outsideOf = async (
  invoices: ExpenseInvoiceService,
  invoiceId: number,
): Promise<number[]> => {
  const detail = await invoices.detail(CAIXA, invoiceId);
  return detail.items
    .filter((item) => item.outsideBusiness)
    .map((item) => item.position);
};

describe('Gasto com itens fora da lanchonete (2026-10-25)', () => {
  it('grava as linhas marcadas e conta no resumo da lista', async () => {
    const { expenses, invoices } = build();
    const expense = await expenses.create(CAIXA, {
      ...MARKET,
      invoiceCode: KEY,
      outsidePositions: [2],
    });
    expect(expense.invoice?.outsideItemCount).toBe(1);
    expect(await outsideOf(invoices, expense.invoice?.id ?? 0)).toEqual([2]);
  });

  it('sem marcação, a nota entra inteira', async () => {
    const { expenses } = build();
    const expense = await expenses.create(CAIXA, {
      ...MARKET,
      invoiceCode: KEY,
    });
    expect(expense.invoice?.outsideItemCount).toBe(0);
  });

  it('posição que não existe na nota é 400', async () => {
    const { expenses } = build();
    await expect(
      expenses.create(CAIXA, {
        ...MARKET,
        invoiceCode: KEY,
        outsidePositions: [9],
      }),
    ).rejects.toThrow('Item 9 não existe na nota (itens 1 a 3)');
  });

  it('a nota inteira de fora não vira gasto (422)', async () => {
    const { expenses } = build();
    await expect(
      expenses.create(CAIXA, {
        ...MARKET,
        invoiceCode: KEY,
        outsidePositions: [1, 2, 3],
      }),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it('marcar item sem nota é 400', async () => {
    const { expenses } = build();
    await expect(
      expenses.create(CAIXA, { ...MARKET, outsidePositions: [1] }),
    ).rejects.toThrow(BadRequestException);
  });

  it('na edição, a lista nova troca as marcas; sem a lista, ficam as de antes', async () => {
    const { expenses, invoices } = build();
    const created = await expenses.create(CAIXA, {
      ...MARKET,
      invoiceCode: KEY,
      outsidePositions: [2],
    });
    const invoiceId = created.invoice?.id ?? 0;
    await expenses.replace(CAIXA, created.id, MARKET);
    expect(await outsideOf(invoices, invoiceId)).toEqual([2]);
    await expenses.replace(CAIXA, created.id, {
      ...MARKET,
      outsidePositions: [1, 3],
    });
    expect(await outsideOf(invoices, invoiceId)).toEqual([1, 3]);
  });

  it('na edição, a posição também é conferida contra a nota mantida', async () => {
    const { expenses } = build();
    const created = await expenses.create(CAIXA, {
      ...MARKET,
      invoiceCode: KEY,
    });
    await expect(
      expenses.replace(CAIXA, created.id, {
        ...MARKET,
        outsidePositions: [4],
      }),
    ).rejects.toThrow('Item 4 não existe na nota (itens 1 a 3)');
  });

  it('trocar a nota na edição grava as marcas na nota nova', async () => {
    const { expenses, invoices } = build();
    const created = await expenses.create(CAIXA, {
      ...MARKET,
      invoiceCode: KEY,
      outsidePositions: [2],
    });
    const edited = await expenses.replace(CAIXA, created.id, {
      ...MARKET,
      invoiceCode: OTHER_KEY,
      outsidePositions: [3],
    });
    expect(await outsideOf(invoices, edited.invoice?.id ?? 0)).toEqual([3]);
  });

  it('tirar a nota e marcar item ao mesmo tempo é 400', async () => {
    const { expenses } = build();
    const created = await expenses.create(CAIXA, {
      ...MARKET,
      invoiceCode: KEY,
    });
    await expect(
      expenses.replace(CAIXA, created.id, {
        ...MARKET,
        invoiceCode: null,
        outsidePositions: [1],
      }),
    ).rejects.toThrow(BadRequestException);
  });
});

describe('Prévia lembra o que é de fora por mercado + código', () => {
  it('o refri marcado na nota anterior do mercado já vem marcado', async () => {
    const { expenses, invoices } = build();
    await expenses.create(CAIXA, {
      ...MARKET,
      invoiceCode: KEY,
      outsidePositions: [2],
    });
    const preview = await invoices.preview({ code: OTHER_KEY });
    expect(preview.outsidePositions).toEqual([2]);
  });

  it('vale a nota mais recente: desmarcado depois, não vem mais marcado', async () => {
    const { expenses, invoices } = build();
    await expenses.create(CAIXA, {
      ...MARKET,
      invoiceCode: KEY,
      outsidePositions: [2],
    });
    await expenses.create(CAIXA, { ...MARKET, invoiceCode: OTHER_KEY });
    const preview = await invoices.preview({ code: LATER_KEY });
    expect(preview.outsidePositions).toEqual([]);
  });

  it('mercado sem nota anterior não sugere nada', async () => {
    const { invoices } = build();
    const preview = await invoices.preview({ code: KEY });
    expect(preview.outsidePositions).toEqual([]);
  });
});
