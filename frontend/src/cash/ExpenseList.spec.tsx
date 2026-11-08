import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { CashApi } from '../api/cash-api';
import type { Expense } from '../api/types';
import { FakeAuth } from '../test-support/FakeAuth';
import { ExpenseList } from './ExpenseList';
import type { CashDay } from './use-cash-day';

const DAY: CashDay = {
  closing: {
    id: 1,
    businessDate: '2026-11-08',
    status: 'OPEN',
  },
  orders: [],
  expenses: [],
  staffConsumptions: [],
  consumerNames: [],
  expenseTypes: [
    { id: 1, name: 'Insumos', nameKey: 'insumos', active: true },
    { id: 2, name: 'Limpeza', nameKey: 'limpeza', active: true },
  ],
  paymentMethods: [],
  zones: [],
  menu: [],
  fiadoDebtors: [],
  fiadoSettled: [],
  fiadoDue: [],
};

const EXPENSE_ACTIVE: Expense = {
  id: 10,
  expenseTypeId: 1,
  description: 'Carne e Queijo',
  amount: '120.00',
  invoice: null,
};

const EXPENSE_CANCELED: Expense = {
  id: 11,
  expenseTypeId: 2,
  description: 'Detergente',
  amount: '30.00',
  invoice: null,
  canceledAt: '2026-11-08T13:00:00Z',
  canceledById: 1,
};

function createFakeCashApi(): CashApi {
  return {
    cancelExpense: vi.fn().mockResolvedValue({
      ...EXPENSE_ACTIVE,
      canceledAt: '2026-11-08T13:00:00Z',
    }),
    restoreExpense: vi
      .fn()
      .mockResolvedValue({ ...EXPENSE_CANCELED, canceledAt: null }),
    listExpenseEvents: vi.fn().mockResolvedValue([
      {
        id: 1,
        at: '2026-11-08T12:00:00Z',
        userRole: 'ADMIN',
        details: {
          kind: 'CREATED',
          expense: {
            amount: '120.00',
            expenseTypeId: 1,
            description: 'Carne e Queijo',
            invoice: null,
          },
        },
      },
    ]),
  } as unknown as CashApi;
}

describe('ExpenseList', () => {
  it('caixa vê botões Editar e Cancelar, mas não vê Histórico nem Restaurar', () => {
    const cash = createFakeCashApi();
    render(
      <FakeAuth role="CAIXA">
        <ExpenseList
          cash={cash}
          day={{ ...DAY, expenses: [EXPENSE_ACTIVE, EXPENSE_CANCELED] }}
          locked={false}
          onEdit={vi.fn()}
          onChanged={vi.fn()}
        />
      </FakeAuth>,
    );

    expect(screen.getByRole('button', { name: 'Editar' })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Cancelar' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Histórico' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Restaurar' })).toBeNull();
  });

  it('admin vê Histórico em gasto ativo e Restaurar + Histórico em cancelado', () => {
    const cash = createFakeCashApi();
    render(
      <FakeAuth role="ADMIN">
        <ExpenseList
          cash={cash}
          day={{ ...DAY, expenses: [EXPENSE_ACTIVE, EXPENSE_CANCELED] }}
          locked={false}
          onEdit={vi.fn()}
          onChanged={vi.fn()}
        />
      </FakeAuth>,
    );

    const rows = screen.getAllByRole('row');
    // Header + 2 data rows
    expect(rows).toHaveLength(3);
    expect(rows[2]).toHaveAttribute('data-canceled');

    expect(
      within(rows[1]).getByRole('button', { name: 'Editar' }),
    ).toBeInTheDocument();
    expect(
      within(rows[1]).getByRole('button', { name: 'Cancelar' }),
    ).toBeInTheDocument();
    expect(
      within(rows[1]).getByRole('button', { name: 'Histórico' }),
    ).toBeInTheDocument();

    expect(
      within(rows[2]).getByRole('button', { name: 'Restaurar' }),
    ).toBeInTheDocument();
    expect(
      within(rows[2]).getByRole('button', { name: 'Histórico' }),
    ).toBeInTheDocument();
  });

  it('clicar em Cancelar abre diálogo de confirmação (sem senha) e confirma', async () => {
    const cash = createFakeCashApi();
    const onChanged = vi.fn();
    render(
      <FakeAuth role="CAIXA">
        <ExpenseList
          cash={cash}
          day={{ ...DAY, expenses: [EXPENSE_ACTIVE] }}
          locked={false}
          onEdit={vi.fn()}
          onChanged={onChanged}
        />
      </FakeAuth>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByText(/Cancelar gasto #10/)).toBeInTheDocument();

    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Cancelar gasto' }),
    );
    expect(cash.cancelExpense).toHaveBeenCalledWith(10);
    expect(onChanged).toHaveBeenCalled();
  });

  it('admin clicando em Restaurar chama cash.restoreExpense', async () => {
    const cash = createFakeCashApi();
    const onChanged = vi.fn();
    render(
      <FakeAuth role="ADMIN">
        <ExpenseList
          cash={cash}
          day={{ ...DAY, expenses: [EXPENSE_CANCELED] }}
          locked={false}
          onEdit={vi.fn()}
          onChanged={onChanged}
        />
      </FakeAuth>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Restaurar' }));
    expect(cash.restoreExpense).toHaveBeenCalledWith(11);
    expect(onChanged).toHaveBeenCalled();
  });

  it('admin clicando em Histórico abre ExpenseHistoryDialog com os eventos', async () => {
    const cash = createFakeCashApi();
    render(
      <FakeAuth role="ADMIN">
        <ExpenseList
          cash={cash}
          day={{ ...DAY, expenses: [EXPENSE_ACTIVE] }}
          locked={false}
          onEdit={vi.fn()}
          onChanged={vi.fn()}
        />
      </FakeAuth>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Histórico' }));
    const dialog = await screen.findByRole('dialog');
    expect(
      within(dialog).getByText(/Histórico do gasto #10/),
    ).toBeInTheDocument();
    expect(
      await within(dialog).findByText(/Lançado: R\$ 120,00/),
    ).toBeInTheDocument();
  });
});
