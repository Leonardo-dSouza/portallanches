import { Reflector } from '@nestjs/core';
import { describe, expect, it } from 'vitest';
import { ROLES_KEY } from '../auth/auth-decorators.js';
import {
  ADMIN,
  CAIXA,
  FakeClosingLookup,
  FakeExpenseRepository,
  FakeExpenseTypeRepository,
  buildInvoiceReader,
} from './expense-fakes.fixture.js';
import { ExpenseTypeService } from './expense-type.service.js';
import { ExpenseService } from './expense.service.js';
import { ExpensesController } from './expenses.controller.js';
import { FakeNfcePageSource } from '../nfce/nfce-fakes.fixture.js';

function rolesOf(method: keyof ExpensesController): unknown {
  const handler = Object.getOwnPropertyDescriptor(
    ExpensesController.prototype,
    method,
  )?.value as () => unknown;
  return new Reflector().get(ROLES_KEY, handler);
}

function buildController() {
  const repo = new FakeExpenseRepository();
  const closings = new FakeClosingLookup();
  const types = new ExpenseTypeService(new FakeExpenseTypeRepository());
  const pages = new FakeNfcePageSource();
  const reader = buildInvoiceReader(repo, pages);
  const service = new ExpenseService(repo, closings, types, reader);
  const controller = new ExpensesController(service);
  return { controller, service, repo };
}

describe('ExpensesController', () => {
  it('cancela um gasto ativo', async () => {
    const { controller } = buildController();
    const created = await controller.create(CAIXA, {
      expenseTypeId: 1,
      amount: '50.00',
    });
    const canceled = await controller.cancel(CAIXA, created.id);
    expect(canceled.canceledAt).not.toBeNull();
  });

  it('restaura um gasto cancelado', async () => {
    const { controller } = buildController();
    const created = await controller.create(CAIXA, {
      expenseTypeId: 1,
      amount: '50.00',
    });
    await controller.cancel(CAIXA, created.id);
    const restored = await controller.restore(ADMIN, created.id);
    expect(restored.canceledAt).toBeNull();
  });

  it('lista os eventos do gasto para o admin', async () => {
    const { controller } = buildController();
    const created = await controller.create(CAIXA, {
      expenseTypeId: 1,
      amount: '50.00',
    });
    await controller.cancel(CAIXA, created.id);
    const events = await controller.events(created.id);
    expect(events).toHaveLength(2);
    expect(events[0].details.kind).toBe('CREATED');
    expect(events[1].details.kind).toBe('CANCELED');
  });

  it('rotas restore e events são restritas ao ADMIN (@Roles)', () => {
    expect(rolesOf('restore')).toEqual(['ADMIN']);
    expect(rolesOf('events')).toEqual(['ADMIN']);
  });
});
