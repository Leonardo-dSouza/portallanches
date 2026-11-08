import { describe, expect, it } from 'vitest';
import type { ExpenseEvent, ExpenseSnapshot } from '../api/expense-event-types';
import type { ExpenseType } from '../api/types';
import { eventText } from './expense-event-text';

const TYPES: ExpenseType[] = [
  { id: 1, name: 'Insumos', nameKey: 'insumos', active: true },
  { id: 2, name: 'Limpeza', nameKey: 'limpeza', active: true },
  { id: 3, name: 'Freelancer', nameKey: 'freelancer', active: true },
];

const SNAPSHOT: ExpenseSnapshot = {
  amount: '120.00',
  expenseTypeId: 1,
  description: 'Gás P45',
  invoice: null,
};

const makeEvent = (
  details: ExpenseEvent['details'],
  fields: Partial<ExpenseEvent> = {},
): ExpenseEvent => ({
  id: 1,
  at: '2026-11-08T13:00:00Z',
  userRole: 'ADMIN',
  details,
  ...fields,
});

describe('expense eventText', () => {
  it('lançado: valor, tipo e observação', () => {
    expect(
      eventText(makeEvent({ kind: 'CREATED', expense: SNAPSHOT }), TYPES),
    ).toBe('Lançado: R$ 120,00 · Insumos · Gás P45 (admin)');
  });

  it('lançado com nota fiscal e itens de fora', () => {
    const withInv: ExpenseSnapshot = {
      ...SNAPSHOT,
      invoice: { vendorName: 'Assaí', outsideCount: 2 },
    };
    expect(
      eventText(makeEvent({ kind: 'CREATED', expense: withInv }), TYPES),
    ).toBe(
      'Lançado: R$ 120,00 · Insumos · Gás P45 · nota: Assaí (2 fora) (admin)',
    );
  });

  it('alterado: mostra campos antes → depois', () => {
    const after: ExpenseSnapshot = {
      amount: '150.00',
      expenseTypeId: 2,
      description: 'Detergente',
      invoice: { vendorName: 'Assaí', outsideCount: 0 },
    };
    expect(
      eventText(
        makeEvent(
          { kind: 'EDITED', before: SNAPSHOT, after },
          { userRole: 'CAIXA' },
        ),
        TYPES,
      ),
    ).toBe(
      'Alterado: R$ 120,00 → R$ 150,00 · Insumos → Limpeza · Gás P45 → Detergente · sem nota → nota anexada (Assaí) (caixa)',
    );
  });

  it('alterado: nota tirada e itens de fora alterados', () => {
    const before: ExpenseSnapshot = {
      ...SNAPSHOT,
      invoice: { vendorName: 'Assaí', outsideCount: 1 },
    };
    const after: ExpenseSnapshot = {
      ...SNAPSHOT,
      invoice: null,
    };
    expect(eventText(makeEvent({ kind: 'EDITED', before, after }), TYPES)).toBe(
      'Alterado: com nota → nota tirada (admin)',
    );
  });

  it('cancelado e cancelamento desfeito (restaurado)', () => {
    expect(
      eventText(makeEvent({ kind: 'CANCELED' }, { userRole: 'CAIXA' }), TYPES),
    ).toBe('Cancelado (caixa)');

    expect(eventText(makeEvent({ kind: 'RESTORED' }), TYPES)).toBe(
      'Cancelamento desfeito (admin)',
    );
  });
});
