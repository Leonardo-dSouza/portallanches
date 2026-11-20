import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, onTestFinished, vi } from 'vitest';
import { ApiContext } from '../api/api-context';
import type { PurchaseInvoiceRow } from '../api/purchase-types';
import { FakeApiClient } from '../test-support/fake-api-client';
import { FakeAuth } from '../test-support/FakeAuth';
import { invoiceDetailOf } from '../test-support/invoice-fixture';
import { EditableInvoiceDialog } from './EditableInvoiceDialog';

function invoiceRow(
  fields: Partial<PurchaseInvoiceRow> = {},
): PurchaseInvoiceRow {
  return {
    id: 10,
    expenseId: 5,
    vendorId: 1,
    vendorName: 'Supermercado Modelo',
    number: 1234,
    series: 1,
    issuedAt: '2026-11-14T12:00:00.000Z',
    itemCount: 1,
    outsideItemCount: 0,
    aboveBaseCount: 0,
    amountDue: '100.00',
    expenseAmount: '100.00',
    businessDate: '2026-11-14',
    stockEnteredAt: null,
    stockEnteredByName: null,
    items: [
      {
        id: 101,
        position: 1,
        code: 'HB-01',
        description: 'Hambúrguer 56g',
        quantity: '2',
        unit: 'Cx',
        unitPrice: '50.00',
        total: '100.00',
        outsideBusiness: false,
        link: {
          supplyId: 10,
          supplyName: 'Hambúrguer artesanal',
          baseQuantity: '36',
          label: 'caixa',
          productName: null,
          deductOnSale: true,
        },
        alert: null,
      },
    ],
    ...fields,
  };
}

function setupApi(row: PurchaseInvoiceRow) {
  const api = new FakeApiClient();
  api.invoiceDetails[row.id] = {
    ...invoiceDetailOf(row.id, row.expenseId, row.amountDue),
    vendorName: row.vendorName,
  };
  api.purchases.invoices = [row];
  return api;
}

describe('EditableInvoiceDialog - Lançamento no estoque', () => {
  it('nota anterior a 14/11 não mostra a tecla "Lançar no estoque"', async () => {
    const row = invoiceRow({ issuedAt: '2026-11-13T23:00:00.000Z' });
    const api = setupApi(row);

    render(
      <ApiContext.Provider value={api}>
        <FakeAuth role="ADMIN">
          <EditableInvoiceDialog
            invoiceId={row.id}
            purchaseInvoice={row}
            onSaved={vi.fn()}
            onClose={vi.fn()}
          />
        </FakeAuth>
      </ApiContext.Provider>,
    );

    expect(await screen.findByText('Supermercado Modelo')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Lançar no estoque/i }),
    ).not.toBeInTheDocument();
  });

  it('nota já lançada mostra o selo e não a tecla', async () => {
    const row = invoiceRow({
      issuedAt: '2026-11-14T12:00:00.000Z',
      stockEnteredAt: '2026-11-14T15:30:00.000Z',
      stockEnteredByName: 'Admin',
    });
    const api = setupApi(row);

    render(
      <ApiContext.Provider value={api}>
        <FakeAuth role="ADMIN">
          <EditableInvoiceDialog
            invoiceId={row.id}
            purchaseInvoice={row}
            onSaved={vi.fn()}
            onClose={vi.fn()}
          />
        </FakeAuth>
      </ApiContext.Provider>,
    );

    expect(await screen.findByText('Supermercado Modelo')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Lançar no estoque/i }),
    ).not.toBeInTheDocument();
    expect(screen.getByText('No estoque · 14/11 · Admin')).toBeInTheDocument();
  });

  it('nota a partir de 14/11 não lançada mostra a tecla "Lançar no estoque" para admin', async () => {
    const row = invoiceRow({
      issuedAt: '2026-11-14T12:00:00.000Z',
      stockEnteredAt: null,
    });
    const api = setupApi(row);

    render(
      <ApiContext.Provider value={api}>
        <FakeAuth role="ADMIN">
          <EditableInvoiceDialog
            invoiceId={row.id}
            purchaseInvoice={row}
            onSaved={vi.fn()}
            onClose={vi.fn()}
          />
        </FakeAuth>
      </ApiContext.Provider>,
    );

    expect(
      await screen.findByRole('button', { name: /Lançar no estoque/i }),
    ).toBeInTheDocument();
  });

  it('usuário não-admin não vê a tecla "Lançar no estoque"', async () => {
    const row = invoiceRow({
      issuedAt: '2026-11-14T12:00:00.000Z',
      stockEnteredAt: null,
    });
    const api = setupApi(row);

    render(
      <ApiContext.Provider value={api}>
        <FakeAuth role="CAIXA">
          <EditableInvoiceDialog
            invoiceId={row.id}
            purchaseInvoice={row}
            onSaved={vi.fn()}
            onClose={vi.fn()}
          />
        </FakeAuth>
      </ApiContext.Provider>,
    );

    expect(await screen.findByText('Supermercado Modelo')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Lançar no estoque/i }),
    ).not.toBeInTheDocument();
  });

  it('ao clicar em "Lançar no estoque", abre o diálogo de lançamento e ao salvar mostra o selo', async () => {
    // O fake carimba o lançamento com a hora de agora: sem relógio fixo o selo mudava de dia e o
    // teste quebrava depois de 14/11 (CI de 18/11). Só o Date é falso; os timers seguem reais.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-14T22:00:00-03:00'));
    onTestFinished(() => {
      vi.useRealTimers();
    });
    const user = userEvent.setup();
    const row = invoiceRow({
      issuedAt: '2026-11-14T12:00:00.000Z',
      stockEnteredAt: null,
    });
    const api = setupApi(row);
    const onSaved = vi.fn();

    render(
      <ApiContext.Provider value={api}>
        <FakeAuth role="ADMIN">
          <EditableInvoiceDialog
            invoiceId={row.id}
            purchaseInvoice={row}
            onSaved={onSaved}
            onClose={vi.fn()}
          />
        </FakeAuth>
      </ApiContext.Provider>,
    );

    const button = await screen.findByRole('button', {
      name: /Lançar no estoque/i,
    });
    await user.click(button);

    // Diálogo de lançamento abre
    expect(
      screen.getByRole('dialog', { name: 'Lançar no estoque' }),
    ).toBeInTheDocument();

    // Clica no botão de lançar do diálogo
    await user.click(
      screen.getByRole('button', { name: /Lançar 1 item no estoque/i }),
    );

    // Diálogo fecha e selo aparece
    expect(await screen.findByText(/No estoque · 14\/11/i)).toBeInTheDocument();
    expect(onSaved).toHaveBeenCalled();
  });
});
