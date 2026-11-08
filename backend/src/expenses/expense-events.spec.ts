import { ConflictException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { FakeNfcePageSource } from '../nfce/nfce-fakes.fixture.js';
import { nfcePageHtml, SAMPLE_PAGE } from '../nfce/nfce-page.fixture.js';
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

const KEY = '35261011222333000181650010000012341123456780';

function build() {
  const repo = new FakeExpenseRepository();
  const closings = new FakeClosingLookup();
  const types = new ExpenseTypeService(new FakeExpenseTypeRepository());
  const pages = new FakeNfcePageSource().serve(KEY, nfcePageHtml(SAMPLE_PAGE));
  const reader = buildInvoiceReader(repo, pages);
  const service = new ExpenseService(repo, closings, types, reader);
  return { service, repo, pages, closings };
}

describe('Histórico e cancelamento de gastos', () => {
  it('registra evento CREATED ao criar gasto', async () => {
    const { service } = build();
    const created = await service.create(CAIXA, {
      expenseTypeId: 1,
      description: 'Gás P45',
      amount: '120.00',
    });
    const events = await service.listEvents(created.id);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      userRole: 'CAIXA',
      details: {
        kind: 'CREATED',
        expense: {
          amount: '120.00',
          expenseTypeId: 1,
          description: 'Gás P45',
          invoice: null,
        },
      },
    });
  });

  it('registra evento EDITED com antes → depois ao alterar gasto', async () => {
    const { service } = build();
    const created = await service.create(CAIXA, {
      expenseTypeId: 1,
      description: 'Gás P45',
      amount: '120.00',
    });
    await service.replace(ADMIN, created.id, {
      expenseTypeId: 3,
      description: 'Gás e Limpeza',
      amount: '150.00',
    });
    const events = await service.listEvents(created.id);
    expect(events).toHaveLength(2);
    expect(events[1]).toMatchObject({
      userRole: 'ADMIN',
      details: {
        kind: 'EDITED',
        before: {
          amount: '120.00',
          expenseTypeId: 1,
          description: 'Gás P45',
        },
        after: {
          amount: '150.00',
          expenseTypeId: 3,
          description: 'Gás e Limpeza',
        },
      },
    });
  });

  it('registra eventos CANCELED e RESTORED', async () => {
    const { service } = build();
    const created = await service.create(CAIXA, {
      expenseTypeId: 1,
      amount: '50.00',
    });
    await service.cancel(CAIXA, created.id);
    await service.restore(ADMIN, created.id);
    const events = await service.listEvents(created.id);
    expect(events).toHaveLength(3);
    expect(events[1].details).toMatchObject({ kind: 'CANCELED' });
    expect(events[1].userRole).toBe('CAIXA');
    expect(events[2].details).toMatchObject({ kind: 'RESTORED' });
    expect(events[2].userRole).toBe('ADMIN');
  });

  it('cancelar gasto já cancelado lança 409 ConflictException', async () => {
    const { service } = build();
    const created = await service.create(CAIXA, {
      expenseTypeId: 1,
      amount: '50.00',
    });
    await service.cancel(CAIXA, created.id);
    await expect(service.cancel(CAIXA, created.id)).rejects.toThrow(
      ConflictException,
    );
  });

  it('restaurar gasto ativo lança 409 ConflictException', async () => {
    const { service } = build();
    const created = await service.create(CAIXA, {
      expenseTypeId: 1,
      amount: '50.00',
    });
    await expect(service.restore(ADMIN, created.id)).rejects.toThrow(
      ConflictException,
    );
  });

  it('editar gasto cancelado lança 409 ConflictException', async () => {
    const { service } = build();
    const created = await service.create(CAIXA, {
      expenseTypeId: 1,
      amount: '50.00',
    });
    await service.cancel(CAIXA, created.id);
    await expect(
      service.replace(CAIXA, created.id, {
        expenseTypeId: 1,
        amount: '60.00',
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('gasto antigo sem eventos devolve lista vazia', async () => {
    const { service, repo } = build();
    const old = await repo.create(
      10,
      1,
      {
        expenseTypeId: 1,
        description: null,
        amount: '100.00',
      },
      null,
    );
    const events = await service.listEvents(old.id);
    expect(events).toEqual([]);
  });

  it('reler nota de gasto cancelado em outro gasto dá erro claro de 409', async () => {
    const { service } = build();
    const first = await service.create(CAIXA, {
      expenseTypeId: 3,
      amount: '1320.00',
      invoiceCode: KEY,
    });
    await service.cancel(CAIXA, first.id);

    await expect(
      service.create(CAIXA, {
        expenseTypeId: 3,
        amount: '1320.00',
        invoiceCode: KEY,
      }),
    ).rejects.toThrow(
      /nota já lançada no gasto de 22\/09, cancelado: restaure-o ou tire a nota dele/i,
    );
  });
});
