import type {
  ProductPriceSummary,
  ProductPurchase,
  PurchaseInvoiceRow,
  VendorSummary,
} from '../api/purchase-types';

// Compras sintéticas (o repositório é público): dois mercados de exemplo em setembro.
export const PURCHASE_INVOICES: PurchaseInvoiceRow[] = [
  {
    id: 101,
    expenseId: 7,
    vendorId: 1,
    vendorName: 'Exemplo',
    number: 25767,
    series: 12,
    issuedAt: '2026-09-22T20:14:11.000Z',
    itemCount: 2,
    outsideItemCount: 0,
    amountDue: '64.91',
    expenseAmount: '60.00',
    businessDate: '2026-09-22',
  },
  {
    id: 102,
    expenseId: 8,
    vendorId: 2,
    vendorName: 'MERCADO DOIS LTDA',
    number: 106246,
    series: 401,
    issuedAt: '2026-09-15T19:27:58.000Z',
    itemCount: 7,
    outsideItemCount: 0,
    amountDue: '201.31',
    expenseAmount: '201.31',
    businessDate: '2026-09-15',
  },
];

const product = (
  fields: Partial<ProductPriceSummary> &
    Pick<ProductPriceSummary, 'code' | 'description'>,
): ProductPriceSummary => ({
  vendorId: 1,
  vendorName: 'Exemplo',
  unit: 'UN',
  lastPrice: '4.49',
  lastPurchasedAt: '2026-09-22T20:14:11.000Z',
  previousPrice: null,
  minPrice: '4.49',
  maxPrice: '4.49',
  purchaseCount: 1,
  ...fields,
});

export const PURCHASE_PRODUCTS: ProductPriceSummary[] = [
  product({
    code: '1128810',
    description: 'BACON EXEMPLO kg',
    unit: 'Kg',
    lastPrice: '21.5',
    previousPrice: '20.4',
    minPrice: '19.9',
    maxPrice: '21.5',
    purchaseCount: 3,
  }),
  product({ code: '6806', description: 'REF COCA COLA 350ML' }),
  product({
    vendorId: 2,
    vendorName: 'MERCADO DOIS LTDA',
    code: '501',
    description: 'AÇÚCAR UNIÃO 1KG',
    lastPrice: '4.99',
  }),
];

export const BACON_HISTORY: ProductPurchase[] = [
  {
    invoiceId: 101,
    invoiceNumber: 25767,
    issuedAt: '2026-09-22T20:14:11.000Z',
    description: 'BACON EXEMPLO kg',
    quantity: '1.248',
    unit: 'Kg',
    unitPrice: '21.5',
    total: '26.83',
  },
  {
    invoiceId: 90,
    invoiceNumber: 25001,
    issuedAt: '2026-09-08T20:00:00.000Z',
    description: 'BACON EXEMPLO kg',
    quantity: '1.1',
    unit: 'Kg',
    unitPrice: '20.4',
    total: '22.44',
  },
];

export const PURCHASE_VENDORS: VendorSummary[] = [
  {
    id: 2,
    cnpjRoot: '99888777',
    legalName: 'MERCADO DOIS LTDA',
    nickname: null,
    invoiceCount: 1,
    total: '201.31',
  },
  {
    id: 1,
    cnpjRoot: '11222333',
    legalName: 'MERCADO EXEMPLO LTDA',
    nickname: 'Exemplo',
    invoiceCount: 1,
    total: '64.91',
  },
];
