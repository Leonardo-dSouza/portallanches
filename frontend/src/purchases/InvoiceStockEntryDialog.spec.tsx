import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '../api/api-client';
import { ApiContext } from '../api/api-context';
import type { PurchaseInvoiceItemRow } from '../api/purchase-types';
import { FakeApiClient } from '../test-support/fake-api-client';
import { InvoiceStockEntryDialog } from './InvoiceStockEntryDialog';

const ITEMS: PurchaseInvoiceItemRow[] = [
  {
    id: 1,
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
    },
    alert: null,
  },
  {
    id: 2,
    position: 2,
    code: 'QP-01',
    description: 'Queijo Prato',
    quantity: '3',
    unit: 'kg',
    unitPrice: '40.00',
    total: '120.00',
    outsideBusiness: false,
    link: null,
    alert: null,
  },
  {
    id: 3,
    position: 3,
    code: 'DOG-01',
    description: 'Ração de Cachorro',
    quantity: '1',
    unit: 'sc',
    unitPrice: '80.00',
    total: '80.00',
    outsideBusiness: true,
    link: {
      supplyId: 99,
      supplyName: 'Ração',
      baseQuantity: '1',
      label: null,
      productName: null,
    },
    alert: null,
  },
];

describe('InvoiceStockEntryDialog', () => {
  it('começa com itens ligados marcados, sem ligação desabilitado e fora da lanchonete riscado sem caixa', () => {
    const api = new FakeApiClient();
    render(
      <ApiContext.Provider value={api}>
        <InvoiceStockEntryDialog
          invoiceId={10}
          vendorId={1}
          issuedAt="2026-11-14T10:00:00.000Z"
          items={ITEMS}
          onClose={vi.fn()}
        />
      </ApiContext.Provider>,
    );

    // Item 1 (ligado): marcado e com a conversão "2 Cx → 72 un"
    const check1 = screen.getByRole('checkbox', {
      name: /Selecionar Hambúrguer 56g/i,
    });
    expect(check1).toBeChecked();
    expect(screen.getByText('2 Cx → 72 un')).toBeInTheDocument();

    // Item 2 (sem ligação): desabilitado, desmarcado e tem botão "Ligar a insumo"
    const check2 = screen.getByRole('checkbox', {
      name: /Item sem ligação: Queijo Prato/i,
    });
    expect(check2).toBeDisabled();
    expect(check2).not.toBeChecked();
    expect(
      screen.getByRole('button', { name: 'Ligar a insumo' }),
    ).toBeInTheDocument();

    // Item 3 (fora da lanchonete): sem caixa e riscado
    expect(
      screen.queryByRole('checkbox', { name: /Ração de Cachorro/i }),
    ).not.toBeInTheDocument();
    const outsideText = screen.getByText('Ração de Cachorro');
    expect(outsideText).toHaveClass('line-through');
  });

  it('desabilita o botão de lançar quando 0 itens estiverem marcados', async () => {
    const user = userEvent.setup();
    const api = new FakeApiClient();
    render(
      <ApiContext.Provider value={api}>
        <InvoiceStockEntryDialog
          invoiceId={10}
          vendorId={1}
          issuedAt="2026-11-14T10:00:00.000Z"
          items={ITEMS}
          onClose={vi.fn()}
        />
      </ApiContext.Provider>,
    );

    const submit = screen.getByRole('button', {
      name: /Lançar 1 item no estoque/i,
    });
    expect(submit).toBeEnabled();

    // Desmarca o único item selecionável
    const check1 = screen.getByRole('checkbox', {
      name: /Selecionar Hambúrguer 56g/i,
    });
    await user.click(check1);

    expect(
      screen.getByRole('button', { name: /Lançar 0 itens no estoque/i }),
    ).toBeDisabled();
  });

  it('lança os itens marcados com validade opcional (vazia vai como null)', async () => {
    const user = userEvent.setup();
    const api = new FakeApiClient();
    const onClose = vi.fn();
    const onSuccess = vi.fn();

    render(
      <ApiContext.Provider value={api}>
        <InvoiceStockEntryDialog
          invoiceId={10}
          vendorId={1}
          issuedAt="2026-11-14T10:00:00.000Z"
          items={ITEMS}
          onSuccess={onSuccess}
          onClose={onClose}
        />
      </ApiContext.Provider>,
    );

    // Preenche a validade do item 1
    const dateInput = screen.getByLabelText(/Validade: Hambúrguer 56g/i);
    await user.type(dateInput, '2026-12-31');

    await user.click(
      screen.getByRole('button', { name: /Lançar 1 item no estoque/i }),
    );

    await waitFor(() => {
      expect(api.calls).toContainEqual({
        method: 'POST',
        path: '/purchases/invoices/10/stock-entry',
        body: {
          items: [{ itemId: 1, expiresOn: '2026-12-31' }],
        },
      });
    });
    expect(onSuccess).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('validade vazia vai como null no corpo do POST', async () => {
    const user = userEvent.setup();
    const api = new FakeApiClient();
    const onClose = vi.fn();

    render(
      <ApiContext.Provider value={api}>
        <InvoiceStockEntryDialog
          invoiceId={10}
          vendorId={1}
          issuedAt="2026-11-14T10:00:00.000Z"
          items={ITEMS}
          onClose={onClose}
        />
      </ApiContext.Provider>,
    );

    await user.click(
      screen.getByRole('button', { name: /Lançar 1 item no estoque/i }),
    );

    await waitFor(() => {
      expect(api.calls).toContainEqual({
        method: 'POST',
        path: '/purchases/invoices/10/stock-entry',
        body: {
          items: [{ itemId: 1, expiresOn: null }],
        },
      });
    });
    expect(onClose).toHaveBeenCalled();
  });

  it('409 mostra "Esta nota já foi lançada no estoque." e recarrega', async () => {
    const user = userEvent.setup();
    const api = new FakeApiClient();
    api.request = vi
      .fn()
      .mockRejectedValue(
        new ApiError(409, 'Nota fiscal 10 já foi lançada no estoque'),
      );
    const onReload = vi.fn();

    render(
      <ApiContext.Provider value={api}>
        <InvoiceStockEntryDialog
          invoiceId={10}
          vendorId={1}
          issuedAt="2026-11-14T10:00:00.000Z"
          items={ITEMS}
          onReload={onReload}
          onClose={vi.fn()}
        />
      </ApiContext.Provider>,
    );

    await user.click(
      screen.getByRole('button', { name: /Lançar 1 item no estoque/i }),
    );

    expect(
      await screen.findByText('Esta nota já foi lançada no estoque.'),
    ).toBeInTheDocument();
    expect(onReload).toHaveBeenCalled();
  });

  it('422 mostra a mensagem da API no diálogo', async () => {
    const user = userEvent.setup();
    const api = new FakeApiClient();
    api.request = vi
      .fn()
      .mockRejectedValue(
        new ApiError(
          422,
          'Nota fiscal emitida em 2026-11-13 não pode ser lançada no estoque: início permitido em 2026-11-14',
        ),
      );

    render(
      <ApiContext.Provider value={api}>
        <InvoiceStockEntryDialog
          invoiceId={10}
          vendorId={1}
          issuedAt="2026-11-14T10:00:00.000Z"
          items={ITEMS}
          onClose={vi.fn()}
        />
      </ApiContext.Provider>,
    );

    await user.click(
      screen.getByRole('button', { name: /Lançar 1 item no estoque/i }),
    );

    expect(
      await screen.findByText(
        'Nota fiscal emitida em 2026-11-13 não pode ser lançada no estoque: início permitido em 2026-11-14',
      ),
    ).toBeInTheDocument();
  });

  it('tecla "Ligar a insumo" abre LinkSupplyDialog e ao voltar a linha atualiza', async () => {
    const user = userEvent.setup();
    const api = new FakeApiClient();
    api.supplies = [
      {
        id: 20,
        name: 'Queijo Prato',
        countUnit: 'kg',
        minStock: null,
        deductOnSale: true,
        dailyCount: false,
        sectionId: 1,
        active: true,
        packages: [{ name: 'peça', quantity: '3' }],
        saleProduct: null,
      },
    ];

    render(
      <ApiContext.Provider value={api}>
        <InvoiceStockEntryDialog
          invoiceId={10}
          vendorId={1}
          issuedAt="2026-11-14T10:00:00.000Z"
          items={ITEMS}
          onClose={vi.fn()}
        />
      </ApiContext.Provider>,
    );

    // Clica no botão "Ligar a insumo" do Queijo Prato
    await user.click(screen.getByRole('button', { name: 'Ligar a insumo' }));

    // Diálogo "Ligar a insumo" deve abrir
    expect(
      screen.getByRole('dialog', { name: 'Ligar a insumo' }),
    ).toBeInTheDocument();
  });
});
