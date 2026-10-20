import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { FakeNfcePageSource } from '../nfce/nfce-fakes.fixture.js';
import {
  ADMIN,
  buildInvoiceReader,
  CAIXA,
  FakeClosingLookup,
  FakeExpenseRepository,
  FakeExpenseTypeRepository,
} from './expense-fakes.fixture.js';
import { ExpenseTypeService } from './expense-type.service.js';
import { ExpenseService } from './expense.service.js';

const GAS = { expenseTypeId: 1, amount: 120 };

function build() {
  const repo = new FakeExpenseRepository();
  const closings = new FakeClosingLookup();
  const types = new ExpenseTypeService(new FakeExpenseTypeRepository());
  const reader = buildInvoiceReader(repo, new FakeNfcePageSource());
  const service = new ExpenseService(repo, closings, types, reader);
  return { service, repo, closings };
}

describe('ExpenseService', () => {
  it('grava o gasto no fechamento de hoje', async () => {
    const expense = await build().service.create(CAIXA, GAS);
    expect(expense).toMatchObject({
      closingId: 10,
      amount: '120.00',
      createdById: 2,
    });
  });

  it('valida o corpo antes de gravar', async () => {
    await expect(
      build().service.create(CAIXA, { expenseTypeId: 1, amount: 0 }),
    ).rejects.toThrow(BadRequestException);
  });

  it('caixa não lança com o fechamento fechado, admin lança', async () => {
    const { service, closings } = build();
    closings.today = { ...closings.today, status: 'CLOSED' };
    await expect(service.create(CAIXA, GAS)).rejects.toThrow(
      ForbiddenException,
    );
    await expect(service.create(ADMIN, GAS)).resolves.toMatchObject({
      createdById: 1,
    });
  });

  it('substitui e remove um gasto de hoje', async () => {
    const { service, repo } = build();
    const created = await service.create(CAIXA, GAS);
    const updated = await service.replace(CAIXA, created.id, {
      expenseTypeId: 1,
      description: 'Óleo',
      amount: 80,
    });
    expect(updated).toMatchObject({ description: 'Óleo', amount: '80.00' });
    await service.remove(CAIXA, created.id);
    expect(repo.records).toHaveLength(0);
  });

  it('caixa não edita gasto de outro dia; admin edita', async () => {
    const { service, repo } = build();
    const old = await repo.create(
      5,
      1,
      { expenseTypeId: 1, description: null, amount: '120.00' },
      null,
    );
    await expect(service.replace(CAIXA, old.id, GAS)).rejects.toThrow(
      ForbiddenException,
    );
    await expect(service.replace(ADMIN, old.id, GAS)).resolves.toMatchObject({
      id: old.id,
    });
  });

  it('recusa tipo de gasto inexistente (404) ou inativo (422)', async () => {
    const { service } = build();
    await expect(
      service.create(CAIXA, { expenseTypeId: 99, amount: 5 }),
    ).rejects.toThrow(NotFoundException);
    await expect(
      service.create(CAIXA, { expenseTypeId: 2, amount: 5 }),
    ).rejects.toThrow(/"Velho" \(2\) está inativo/);
    await expect(
      service.create(CAIXA, { expenseTypeId: 2, amount: 5 }),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it('retorna 404 para gasto inexistente', async () => {
    await expect(build().service.remove(CAIXA, 77)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('lista os gastos de hoje e por data', async () => {
    const { service } = build();
    await service.create(CAIXA, GAS);
    expect(await service.listFor(CAIXA)).toHaveLength(1);
    expect(await service.listByDate('2026-09-22')).toHaveLength(1);
  });
});
