import type {
  ExpenseInvoiceSummary,
  InvoicePreview,
} from '../api/invoice-types';
import type { Expense, ExpenseType } from '../api/types';
import {
  fillFromInvoice,
  initialInvoiceDraft,
  invoiceCardOf,
  invoiceCodeField,
  withoutInvoice,
} from './expense-invoice-draft';
import { EMPTY_EXPENSE_FORM } from './expense-form-values';

const TYPES: ExpenseType[] = [
  { id: 1, name: 'Gás', nameKey: 'gas', active: true },
  {
    id: 3,
    name: 'Compra no Atacadão',
    nameKey: 'compra no atacadao',
    active: true,
  },
  { id: 4, name: 'Velho', nameKey: 'velho', active: false },
];

const SUMMARY: ExpenseInvoiceSummary = {
  id: 101,
  vendorName: 'Assaí',
  issuedAt: '2026-10-18T20:14:11.000Z',
  itemCount: 20,
  amountDue: '447.26',
};

const PREVIEW: InvoicePreview = {
  vendorName: 'Assaí',
  suggestion: null,
  invoice: {
    accessKey: '35261011222333000181650010000012341123456780',
    issuerName: 'SENDAS DISTRIBUIDORA S/A',
    issuerCnpj: '06057223058250',
    number: 25767,
    series: 12,
    issuedAt: '2026-10-18T20:14:11.000Z',
    itemsTotal: '449.06',
    discount: '1.80',
    amountDue: '447.26',
    paymentLabel: 'Cartão de Crédito',
    items: [],
  },
};

const expenseWith = (invoice: ExpenseInvoiceSummary | null): Expense => ({
  id: 7,
  expenseTypeId: 3,
  description: null,
  amount: '447.26',
  invoice,
});

describe('initialInvoiceDraft', () => {
  it('gasto novo começa sem nota', () => {
    expect(initialInvoiceDraft(null)).toEqual({ kind: 'none' });
  });

  it('editar um gasto com nota mantém a nota dele', () => {
    expect(initialInvoiceDraft(expenseWith(SUMMARY))).toEqual({
      kind: 'kept',
      summary: SUMMARY,
    });
  });
});

describe('invoiceCodeField', () => {
  it('sem nota ou mantendo a nota, o pedido não fala da nota', () => {
    expect(invoiceCodeField({ kind: 'none' })).toEqual({});
    expect(invoiceCodeField({ kind: 'kept', summary: SUMMARY })).toEqual({});
  });

  it('nota lida vai como o código digitado', () => {
    const draft = {
      kind: 'read',
      code: 'https://x?p=1',
      preview: PREVIEW,
    } as const;
    expect(invoiceCodeField(draft)).toEqual({ invoiceCode: 'https://x?p=1' });
  });

  it('nota tirada vai como null', () => {
    expect(invoiceCodeField({ kind: 'removed' })).toEqual({
      invoiceCode: null,
    });
  });
});

describe('withoutInvoice', () => {
  it('no gasto salvo com nota, tirar manda null', () => {
    expect(withoutInvoice(expenseWith(SUMMARY))).toEqual({ kind: 'removed' });
  });

  it('no gasto sem nota salva, tirar a nota lida volta a nada', () => {
    expect(withoutInvoice(null)).toEqual({ kind: 'none' });
    expect(withoutInvoice(expenseWith(null))).toEqual({ kind: 'none' });
  });
});

describe('fillFromInvoice', () => {
  it('valor recebe o "a pagar" e a observação o nome do mercado', () => {
    expect(fillFromInvoice(EMPTY_EXPENSE_FORM, PREVIEW, TYPES)).toEqual({
      typeName: '',
      amount: '447,26',
      description: 'Assaí',
    });
  });

  it('com sugestão, vêm o tipo e a observação do último gasto do mercado', () => {
    const preview = {
      ...PREVIEW,
      suggestion: { expenseTypeId: 3, description: 'Mercado da semana' },
    };
    expect(fillFromInvoice(EMPTY_EXPENSE_FORM, preview, TYPES)).toEqual({
      typeName: 'Compra no Atacadão',
      amount: '447,26',
      description: 'Mercado da semana',
    });
  });

  it('não troca o tipo e a observação que o caixa já digitou', () => {
    const typed = { typeName: 'Gás', amount: '10', description: 'botijão' };
    const preview = {
      ...PREVIEW,
      suggestion: { expenseTypeId: 3, description: 'Mercado da semana' },
    };
    expect(fillFromInvoice(typed, preview, TYPES)).toEqual({
      typeName: 'Gás',
      amount: '447,26',
      description: 'botijão',
    });
  });

  it('sugestão de um tipo inativo fica de fora', () => {
    const preview = {
      ...PREVIEW,
      suggestion: { expenseTypeId: 4, description: null },
    };
    expect(fillFromInvoice(EMPTY_EXPENSE_FORM, preview, TYPES).typeName).toBe(
      '',
    );
  });
});

describe('invoiceCardOf', () => {
  it('nota lida mostra o número', () => {
    const draft = { kind: 'read', code: 'x', preview: PREVIEW } as const;
    expect(invoiceCardOf(draft)).toEqual({
      vendorName: 'Assaí',
      issuedAt: '2026-10-18T20:14:11.000Z',
      number: 25767,
      itemCount: 0,
      amountDue: '447.26',
    });
  });

  it('nota mantida mostra o resumo do gasto, sem número', () => {
    expect(invoiceCardOf({ kind: 'kept', summary: SUMMARY })).toMatchObject({
      number: null,
      itemCount: 20,
    });
  });

  it('sem nota, sem cartão', () => {
    expect(invoiceCardOf({ kind: 'removed' })).toBeNull();
  });
});
