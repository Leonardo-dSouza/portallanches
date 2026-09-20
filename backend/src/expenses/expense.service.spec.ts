import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { SessionUser } from '../auth/session-user.js';
import type { ClosingLookup } from '../closing/closing-lookup.js';
import type { ClosingRecord } from '../closing/closing-repository.js';
import type {
  ExpenseData,
  ExpenseRecord,
  ExpenseRepository,
} from './expense-repository.js';
import type {
  ExpenseTypeData,
  ExpenseTypeRecord,
  ExpenseTypeRepository,
} from './expense-type-repository.js';
import { ExpenseTypeService } from './expense-type.service.js';
import { ExpenseService } from './expense.service.js';

const CAIXA: SessionUser = { id: 2, name: 'caixa', role: 'CAIXA' };
const ADMIN: SessionUser = { id: 1, name: 'admin', role: 'ADMIN' };
const GAS = { expenseTypeId: 1, amount: 120 };

class FakeExpenseRepository implements ExpenseRepository {
  readonly records: ExpenseRecord[] = [];

  async create(
    closingId: number,
    createdById: number,
    data: ExpenseData,
  ): Promise<ExpenseRecord> {
    const record = {
      id: this.records.length + 1,
      closingId,
      createdById,
      ...data,
    };
    this.records.push(record);
    return record;
  }

  async findById(id: number): Promise<ExpenseRecord | null> {
    return this.records.find((r) => r.id === id) ?? null;
  }

  async update(id: number, data: ExpenseData): Promise<ExpenseRecord> {
    const index = this.records.findIndex((r) => r.id === id);
    this.records[index] = { ...this.records[index], ...data };
    return this.records[index];
  }

  async delete(id: number): Promise<void> {
    this.records.splice(
      this.records.findIndex((r) => r.id === id),
      1,
    );
  }

  async listByClosing(closingId: number): Promise<ExpenseRecord[]> {
    return this.records.filter((r) => r.closingId === closingId);
  }
}

class FakeExpenseTypeRepository implements ExpenseTypeRepository {
  readonly records: ExpenseTypeRecord[] = [
    { id: 1, name: 'Gás', nameKey: 'gas', active: true },
    { id: 2, name: 'Velho', nameKey: 'velho', active: false },
  ];

  async list(): Promise<ExpenseTypeRecord[]> {
    return this.records;
  }

  async findById(id: number): Promise<ExpenseTypeRecord | null> {
    return this.records.find((r) => r.id === id) ?? null;
  }

  async create(data: ExpenseTypeData): Promise<ExpenseTypeRecord> {
    throw new Error(`não usado neste teste: ${data.name}`);
  }

  async update(id: number): Promise<ExpenseTypeRecord> {
    throw new Error(`não usado neste teste: ${id}`);
  }
}

class FakeClosingLookup implements ClosingLookup {
  today: ClosingRecord = {
    id: 10,
    businessDate: '2026-09-22',
    status: 'OPEN',
    motoboyDailyRate: '40.00',
    closedById: null,
    closedAt: null,
    reopenedById: null,
    reopenedAt: null,
    notes: null,
  };

  async getOrCreateToday(): Promise<ClosingRecord> {
    return this.today;
  }

  async getByDate(): Promise<ClosingRecord> {
    return this.today;
  }
}

function build() {
  const repo = new FakeExpenseRepository();
  const closings = new FakeClosingLookup();
  const types = new ExpenseTypeService(new FakeExpenseTypeRepository());
  return { service: new ExpenseService(repo, closings, types), repo, closings };
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
    const old = await repo.create(5, 1, {
      expenseTypeId: 1,
      description: null,
      amount: '120.00',
    });
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
    expect(await service.listToday()).toHaveLength(1);
    expect(await service.listByDate('2026-09-22')).toHaveLength(1);
  });
});
