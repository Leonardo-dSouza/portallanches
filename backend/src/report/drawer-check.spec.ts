import type { PaymentMethodTotal } from './payment-totals.js';
import type { ReportPaymentMethodRow } from './report-source.js';
import {
  buildDrawerReport,
  toCountPaymentMethods,
  type DrawerCheckInput,
} from './drawer-check.js';

const METHODS: ReportPaymentMethodRow[] = [
  {
    id: 1,
    name: 'Dinheiro',
    sortOrder: 1,
    isCardTerminal: false,
    isCash: true,
    isFiado: false,
    active: true,
  },
  {
    id: 2,
    name: 'PIX',
    sortOrder: 2,
    isCardTerminal: false,
    isCash: false,
    isFiado: false,
    active: true,
  },
  {
    id: 3,
    name: 'Cartão Ton',
    sortOrder: 3,
    isCardTerminal: true,
    isCash: false,
    isFiado: false,
    active: false,
  },
  {
    id: 4,
    name: 'Fiado',
    sortOrder: 4,
    isCardTerminal: false,
    isCash: false,
    isFiado: true,
    active: true,
  },
  {
    id: 5,
    name: 'Cartão Antigo',
    sortOrder: 5,
    isCardTerminal: true,
    isCash: false,
    isFiado: false,
    active: false,
  },
];

const TOTALS: PaymentMethodTotal[] = [
  {
    paymentMethodId: 1,
    name: 'Dinheiro',
    ordersCount: 3,
    total: '50.00',
    byMode: [],
  },
  {
    paymentMethodId: 2,
    name: 'PIX',
    ordersCount: 2,
    total: '100.00',
    byMode: [],
  },
  {
    paymentMethodId: 3,
    name: 'Cartão Ton',
    ordersCount: 1,
    total: '25.00',
    byMode: [],
  },
];

describe('drawer-check', () => {
  describe('toCountPaymentMethods', () => {
    it('inclui formas ativas não-fiado e inativas com movimento; fiado nunca entra', () => {
      const toCount = toCountPaymentMethods(METHODS, TOTALS);
      expect(toCount).toEqual([
        { paymentMethodId: 1, name: 'Dinheiro', isCash: true },
        { paymentMethodId: 2, name: 'PIX', isCash: false },
        { paymentMethodId: 3, name: 'Cartão Ton', isCash: false },
      ]);
      // Cartão Antigo (inativo sem movimento) e Fiado não entram
      expect(toCount.some((m) => m.paymentMethodId === 4)).toBe(false);
      expect(toCount.some((m) => m.paymentMethodId === 5)).toBe(false);
    });
  });

  describe('buildDrawerReport', () => {
    it('sem conferência (countedAt nulo) devolve check null', () => {
      const input: DrawerCheckInput = {
        openingCash: '30.00',
        cashTolerance: '2.00',
        countRequired: true,
        paymentMethods: METHODS,
        byPaymentMethod: TOTALS,
        counts: [],
        countedBy: null,
        countedAt: null,
        note: null,
      };
      const report = buildDrawerReport(input);
      expect(report.check).toBeNull();
      expect(report.openingCash).toBe('30.00');
      expect(report.cashTolerance).toBe('2.00');
      expect(report.countRequired).toBe(true);
      expect(report.toCount).toHaveLength(3);
    });

    it('soma troco inicial no esperado do dinheiro e avalia MATCH dentro da tolerância', () => {
      const input: DrawerCheckInput = {
        openingCash: '30.00',
        cashTolerance: '2.00',
        countRequired: false,
        paymentMethods: METHODS,
        byPaymentMethod: TOTALS, // Dinheiro total = 50.00, + troco 30 = 80.00 esperado
        counts: [
          { paymentMethodId: 1, amount: '78.50' }, // diferença -1.50 <= tolerância 2.00 -> MATCH
          { paymentMethodId: 2, amount: '100.00' }, // esperado 100.00 -> MATCH
          { paymentMethodId: 3, amount: '25.00' }, // esperado 25.00 -> MATCH
        ],
        countedBy: 'Maria',
        countedAt: new Date('2026-11-12T23:30:00Z'),
        note: 'Tudo certo',
      };
      const report = buildDrawerReport(input);
      expect(report.check).not.toBeNull();
      expect(report.check?.countedBy).toBe('Maria');
      expect(report.check?.countedAt).toBe('2026-11-12T23:30:00.000Z');
      expect(report.check?.note).toBe('Tudo certo');

      const cashLine = report.check?.lines.find((l) => l.paymentMethodId === 1);
      expect(cashLine).toEqual({
        paymentMethodId: 1,
        name: 'Dinheiro',
        expected: '80.00',
        counted: '78.50',
        difference: '-1.50',
        verdict: 'MATCH',
      });
    });

    it('tolerância só se aplica ao dinheiro: PIX com diferença leva OVER ou SHORT', () => {
      const input: DrawerCheckInput = {
        openingCash: null, // sem abertura
        cashTolerance: '2.00',
        countRequired: true,
        paymentMethods: METHODS,
        byPaymentMethod: TOTALS,
        counts: [
          { paymentMethodId: 1, amount: '45.00' }, // esperado 50.00, diff -5.00 > tolerância -> SHORT
          { paymentMethodId: 2, amount: '101.00' }, // esperado 100.00, diff +1.00 -> OVER
          { paymentMethodId: 3, amount: '20.00' }, // esperado 25.00, diff -5.00 -> SHORT
        ],
        countedBy: 'João',
        countedAt: new Date('2026-11-12T23:00:00Z'),
        note: null,
      };
      const report = buildDrawerReport(input);
      const lines = report.check!.lines;
      expect(lines.find((l) => l.paymentMethodId === 1)?.verdict).toBe('SHORT');
      expect(lines.find((l) => l.paymentMethodId === 2)?.verdict).toBe('OVER');
      expect(lines.find((l) => l.paymentMethodId === 3)?.verdict).toBe('SHORT');
    });

    it('forma com esperado > 0 não contada entra com contado "0.00"', () => {
      const input: DrawerCheckInput = {
        openingCash: '0.00',
        cashTolerance: '2.00',
        countRequired: false,
        paymentMethods: METHODS,
        byPaymentMethod: TOTALS,
        counts: [
          { paymentMethodId: 1, amount: '50.00' },
          // PIX não contado
          { paymentMethodId: 3, amount: '25.00' },
        ],
        countedBy: 'Admin',
        countedAt: new Date('2026-11-12T23:00:00Z'),
        note: null,
      };
      const report = buildDrawerReport(input);
      const pixLine = report.check!.lines.find((l) => l.paymentMethodId === 2);
      expect(pixLine).toEqual({
        paymentMethodId: 2,
        name: 'PIX',
        expected: '100.00',
        counted: '0.00',
        difference: '-100.00',
        verdict: 'SHORT',
      });
    });
  });
});
