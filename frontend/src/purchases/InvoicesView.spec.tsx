import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { ApiContext } from '../api/api-context';
import type { PurchaseInvoiceRow } from '../api/purchase-types';
import { FakeApiClient } from '../test-support/fake-api-client';
import { InvoicesView } from './InvoicesView';

const INVOICES: PurchaseInvoiceRow[] = [
  {
    id: 1,
    expenseId: 10,
    vendorId: 1,
    vendorName: 'Supermercado Central',
    number: 1001,
    series: 1,
    issuedAt: '2026-11-14T10:00:00.000Z',
    itemCount: 5,
    outsideItemCount: 0,
    aboveBaseCount: 0,
    amountDue: '250.00',
    expenseAmount: '250.00',
    businessDate: '2026-11-14',
    stockEnteredAt: '2026-11-14T15:30:00.000Z',
    stockEnteredByName: 'Admin',
  },
  {
    id: 2,
    expenseId: 11,
    vendorId: 1,
    vendorName: 'Supermercado Central',
    number: 1002,
    series: 1,
    issuedAt: '2026-11-14T11:00:00.000Z',
    itemCount: 3,
    outsideItemCount: 0,
    aboveBaseCount: 0,
    amountDue: '120.00',
    expenseAmount: '120.00',
    businessDate: '2026-11-14',
    stockEnteredAt: null,
    stockEnteredByName: null,
  },
];

describe('InvoicesView', () => {
  it('exibe o selo "No estoque · 14/11 · nome" na linha da nota lançada', async () => {
    const api = new FakeApiClient();
    api.purchases.invoices = INVOICES;

    render(
      <ApiContext.Provider value={api}>
        <MemoryRouter>
          <InvoicesView range={{ from: '2026-11-01', to: '2026-11-30' }} />
        </MemoryRouter>
      </ApiContext.Provider>,
    );

    // Nota 1001 foi lançada: exibe o selo na linha
    expect(
      await screen.findByText('No estoque · 14/11 · Admin'),
    ).toBeInTheDocument();

    // Nota 1002 não foi lançada: tem apenas uma ocorrência do selo na tabela
    expect(screen.getAllByText(/No estoque/i)).toHaveLength(1);
  });
});
