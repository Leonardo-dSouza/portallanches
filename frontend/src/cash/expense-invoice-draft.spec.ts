import type {
  ExpenseInvoiceSummary,
  InvoicePreview,
} from '../api/invoice-types';
import type { Expense, ExpenseType } from '../api/types';
import {
  amountHint,
  fillFromInvoice,
  initialInvoiceDraft,
  invoiceCardOf,
  invoiceFields,
  outsideCentsOf,
  readInvoiceDraft,
  withOutsideMarks,
  withoutInvoice,
  type InvoiceCard,
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
  outsideItemCount: 0,
  outsideTotal: '0.00',
  amountDue: '447.26',
};

const PAO = {
  code: '80478',
  description: 'P FORMA S BOYS 450G',
  quantity: '1',
  unit: 'PC',
  unitPrice: '4.89',
  total: '4.89',
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
  outsidePositions: [],
};

/** A mesma nota com 2 pães de forma (posições 9 e 10) que o mercado já teve de fora. */
const PREVIEW_WITH_PAO: InvoicePreview = {
  ...PREVIEW,
  invoice: {
    ...PREVIEW.invoice,
    items: [
      { ...PAO, position: 9 },
      { ...PAO, position: 10 },
    ],
  },
  outsidePositions: [9, 10],
};

const MARKS = { positions: [9, 10], cents: 978 };

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
      outside: null,
    });
  });
});

describe('invoiceFields', () => {
  it('sem nota ou mantendo a nota sem mexer, o pedido não fala da nota', () => {
    expect(invoiceFields({ kind: 'none' })).toEqual({});
    expect(
      invoiceFields({ kind: 'kept', summary: SUMMARY, outside: null }),
    ).toEqual({});
  });

  it('nota lida vai como o código digitado, com as marcas de fora', () => {
    const draft = readInvoiceDraft('https://x?p=1', PREVIEW_WITH_PAO);
    expect(invoiceFields(draft)).toEqual({
      invoiceCode: 'https://x?p=1',
      outsidePositions: [9, 10],
    });
  });

  it('na nota mantida, as marcas vão só depois que o caixa mexeu', () => {
    const kept = initialInvoiceDraft(expenseWith(SUMMARY));
    expect(invoiceFields(withOutsideMarks(kept, MARKS))).toEqual({
      outsidePositions: [9, 10],
    });
  });

  it('nota tirada vai como null', () => {
    expect(invoiceFields({ kind: 'removed' })).toEqual({
      invoiceCode: null,
    });
  });
});

describe('readInvoiceDraft e outsideCentsOf (2026-10-25)', () => {
  it('a nota lida já vem com o que o mercado teve de fora', () => {
    const draft = readInvoiceDraft('x', PREVIEW_WITH_PAO);
    expect(draft).toMatchObject({ kind: 'read', outside: MARKS });
    expect(outsideCentsOf(draft)).toBe(978);
  });

  it('na nota mantida sem mexer, vale a soma gravada no resumo', () => {
    const summary = { ...SUMMARY, outsideItemCount: 3, outsideTotal: '14.67' };
    const kept = initialInvoiceDraft(expenseWith(summary));
    expect(outsideCentsOf(kept)).toBe(1467);
    expect(outsideCentsOf(withOutsideMarks(kept, MARKS))).toBe(978);
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

  it('o Valor já vem sem os itens que o mercado teve de fora', () => {
    const preview = {
      ...PREVIEW_WITH_PAO,
      invoice: { ...PREVIEW_WITH_PAO.invoice, amountDue: '30.00' },
    };
    expect(fillFromInvoice(EMPTY_EXPENSE_FORM, preview, TYPES).amount).toBe(
      '20,22',
    );
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
  it('nota lida mostra o número e os itens de fora', () => {
    expect(invoiceCardOf(readInvoiceDraft('x', PREVIEW_WITH_PAO))).toEqual({
      vendorName: 'Assaí',
      issuedAt: '2026-10-18T20:14:11.000Z',
      number: 25767,
      itemCount: 2,
      amountDue: '447.26',
      outsideCount: 2,
      outsideTotal: '9.78',
    });
  });

  it('nota mantida mostra o resumo do gasto, sem número', () => {
    const summary = { ...SUMMARY, outsideItemCount: 3, outsideTotal: '14.67' };
    const kept = initialInvoiceDraft(expenseWith(summary));
    expect(invoiceCardOf(kept)).toMatchObject({
      number: null,
      itemCount: 20,
      outsideCount: 3,
      outsideTotal: '14.67',
    });
    expect(invoiceCardOf(withOutsideMarks(kept, MARKS))).toMatchObject({
      outsideCount: 2,
      outsideTotal: '9.78',
    });
  });

  it('sem nota, sem cartão', () => {
    expect(invoiceCardOf({ kind: 'removed' })).toBeNull();
  });
});

describe('amountHint', () => {
  const card: InvoiceCard = {
    vendorName: 'Assaí',
    issuedAt: '2026-10-18T20:14:11.000Z',
    number: 25767,
    itemCount: 20,
    amountDue: '447.26',
    outsideCount: 0,
    outsideTotal: '0.00',
  };

  it('Valor igual à nota, sem itens de fora: sem dica', () => {
    expect(amountHint(card, '447,26')).toBeNull();
  });

  it('Valor diferente da nota: mostra o "a pagar"', () => {
    expect(amountHint(card, '400')).toBe('Nota: R$ 447,26');
  });

  it('com itens de fora: mostra quanto saiu', () => {
    const withOutside = { ...card, outsideCount: 3, outsideTotal: '14.67' };
    expect(amountHint(withOutside, '432,59')).toBe(
      'Nota: R$ 447,26 · fora da lanchonete: R$ 14,67',
    );
  });
});
