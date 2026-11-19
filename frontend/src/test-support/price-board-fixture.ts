import type { SupplyPriceBoardRow } from '../api/purchase-types';

/** Bacon: Seara no Assaí (o mais barato) e no Spani, Aurora no Frios & Cia (2026-11-18). */
export const BACON_BOARD: SupplyPriceBoardRow = {
  supplyId: 10,
  supplyName: 'Bacon',
  countUnit: 'kg',
  last: {
    productName: 'Bacon Seara kg',
    vendorName: 'Assaí',
    paidPerUnit: '36.9',
    issuedAt: '2026-11-11T12:00:00.000Z',
  },
  cheapest: {
    productName: 'Bacon Seara kg',
    vendorName: 'Assaí',
    paidPerUnit: '36.9',
    issuedAt: '2026-11-11T12:00:00.000Z',
  },
  spent: '230.70',
  purchaseCount: 4,
  products: [
    {
      productName: 'Bacon Seara kg',
      markets: [
        {
          vendorName: 'Assaí',
          paidPerUnit: '36.9',
          issuedAt: '2026-11-11T12:00:00.000Z',
          purchaseCount: 2,
          cheapest: true,
        },
        {
          vendorName: 'Spani',
          paidPerUnit: '38.5',
          issuedAt: '2026-10-28T12:00:00.000Z',
          purchaseCount: 1,
          cheapest: false,
        },
      ],
    },
    {
      productName: 'Bacon Aurora manta kg',
      markets: [
        {
          vendorName: 'Frios & Cia',
          paidPerUnit: '41.9',
          issuedAt: '2026-11-05T12:00:00.000Z',
          purchaseCount: 1,
          cheapest: true,
        },
      ],
    },
  ],
};
