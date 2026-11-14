import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { ApiContext } from '../api/api-context';
import type { PurchaseInvoiceRow } from '../api/purchase-types';
import type { Supply } from '../api/types';
import { PurchasesPage } from '../pages/PurchasesPage';
import { FakeApiClient } from '../test-support/fake-api-client';
import { invoiceDetailOf } from '../test-support/invoice-fixture';

const TODAY = new Date(2026, 8, 22);

const INVOICE_WITH_ALERT: PurchaseInvoiceRow = {
  id: 101,
  expenseId: 7,
  vendorId: 1,
  vendorName: 'Exemplo',
  number: 25767,
  series: 12,
  issuedAt: '2026-09-22T20:14:11.000Z',
  itemCount: 2,
  outsideItemCount: 1,
  aboveBaseCount: 1,
  amountDue: '64.91',
  expenseAmount: '60.00',
  businessDate: '2026-09-22',
  items: [
    {
      id: 101,
      position: 1,
      code: '1128810',
      description: 'BACON EXEMPLO kg',
      quantity: '1.248',
      unit: 'Kg',
      unitPrice: '19.9',
      total: '24.83',
      outsideBusiness: false,
      link: {
        supplyId: 10,
        supplyName: 'Hambúrguer 56g',
        baseQuantity: '36',
        label: 'caixa',
      },
      alert: {
        paidPerUnit: '1.2719',
        basePerUnit: '1.2444',
        diffPercent: '2.2',
        above: true,
      },
    },
    {
      id: 102,
      position: 2,
      code: '7890000000017',
      description: 'REF COLA 350ML',
      quantity: '12',
      unit: 'UN',
      unitPrice: '3.49',
      total: '41.88',
      outsideBusiness: true,
      link: null,
      alert: null,
    },
  ],
};

const SUPPLIES: Supply[] = [
  {
    id: 10,
    name: 'Hambúrguer 56g',
    countUnit: 'un',
    minStock: null,
    deductOnSale: true,
    dailyCount: false,
    sectionId: 1,
    active: true,
    packages: [{ name: 'caixa', quantity: '36' }],
    saleProduct: null,
  },
];

function createTestApi() {
  const api = new FakeApiClient();
  api.role = 'ADMIN';
  api.purchases.invoices = [{ ...INVOICE_WITH_ALERT }];
  api.supplies = SUPPLIES;
  const detail = invoiceDetailOf(101, 7, '60.00');
  detail.items[1].outsideBusiness = true;
  api.invoiceDetails[101] = detail;
  return api;
}

describe('Avisos de preço e ligação de item em Compras → Notas', () => {
  it('mostra o selo "1 acima da base" na linha da nota com aboveBaseCount > 0', async () => {
    const api = createTestApi();
    render(
      <ApiContext.Provider value={api}>
        <MemoryRouter initialEntries={['/compras']}>
          <PurchasesPage today={TODAY} />
        </MemoryRouter>
      </ApiContext.Provider>,
    );

    expect(await screen.findByText('1 acima da base')).toBeInTheDocument();
  });

  it('no detalhe da nota, item ligado mostra insumo ligado, pago/base/diferença e fora não mostra nada', async () => {
    const user = userEvent.setup();
    const api = createTestApi();
    render(
      <ApiContext.Provider value={api}>
        <MemoryRouter initialEntries={['/compras']}>
          <PurchasesPage today={TODAY} />
        </MemoryRouter>
      </ApiContext.Provider>,
    );

    await user.click(
      await screen.findByRole('button', { name: 'Ver a nota 25767' }),
    );
    const dialog = await screen.findByRole('dialog', { name: 'Exemplo' });

    // Item 1 (da lanchonete): mostra insumo ligado e alerta
    expect(
      within(dialog).getByText(/Hambúrguer 56g · caixa de 36/),
    ).toBeInTheDocument();
    expect(within(dialog).getByText(/Pago: 1,2719/)).toBeInTheDocument();
    expect(within(dialog).getByText(/Base: 1,2444/)).toBeInTheDocument();
    const diff = within(dialog).getByText('+2,2%');
    expect(diff).toHaveClass('text-danger');

    // Item 2 (fora da lanchonete): não mostra botão de ligar nem alerta
    const colaRow = within(dialog)
      .getByText('REF COLA 350ML')
      .closest('tr') as HTMLElement;
    expect(within(colaRow).queryByText('Ligar a insumo')).toBeNull();
    expect(within(colaRow).queryByText(/Pago:/)).toBeNull();
  });

  it('permite ligar item a insumo gravando PUT e desvincular com DELETE', async () => {
    const user = userEvent.setup();
    const api = createTestApi();
    render(
      <ApiContext.Provider value={api}>
        <MemoryRouter initialEntries={['/compras']}>
          <PurchasesPage today={TODAY} />
        </MemoryRouter>
      </ApiContext.Provider>,
    );

    await user.click(
      await screen.findByRole('button', { name: 'Ver a nota 25767' }),
    );
    const dialog = await screen.findByRole('dialog', { name: 'Exemplo' });

    // Clica no insumo ligado para abrir diálogo
    await user.click(within(dialog).getByText(/Hambúrguer 56g · caixa de 36/));
    const linkDialog = await screen.findByRole('dialog', {
      name: 'Ligar a insumo',
    });

    // Clica em Desligar
    await user.click(
      within(linkDialog).getByRole('button', { name: 'Desligar' }),
    );

    expect(api.calls).toContainEqual({
      method: 'DELETE',
      path: '/purchases/item-links/1/1128810',
      body: undefined,
    });
  });

  it('permite ligar item não vinculado gravando PUT com insumo e embalagem', async () => {
    const user = userEvent.setup();
    const api = createTestApi();
    // Torna o item 1 não vinculado
    api.purchases.invoices[0].items![0].link = null;
    api.purchases.invoices[0].items![0].alert = null;

    render(
      <ApiContext.Provider value={api}>
        <MemoryRouter initialEntries={['/compras']}>
          <PurchasesPage today={TODAY} />
        </MemoryRouter>
      </ApiContext.Provider>,
    );

    await user.click(
      await screen.findByRole('button', { name: 'Ver a nota 25767' }),
    );
    const dialog = await screen.findByRole('dialog', { name: 'Exemplo' });

    // Item não vinculado mostra tecla "Ligar a insumo"
    const linkButton = within(dialog).getByRole('button', {
      name: 'Ligar a insumo',
    });
    await user.click(linkButton);

    const linkDialog = await screen.findByRole('dialog', {
      name: 'Ligar a insumo',
    });
    const supplySelect = within(linkDialog).getByRole('combobox', {
      name: 'Insumo',
    });
    await user.selectOptions(supplySelect, '10');

    const packageSelect = within(linkDialog).getByRole('combobox', {
      name: 'Embalagem',
    });
    await user.selectOptions(packageSelect, 'caixa');

    await user.click(
      within(linkDialog).getByRole('button', { name: 'Gravar' }),
    );

    expect(api.calls).toContainEqual({
      method: 'PUT',
      path: '/purchases/item-links',
      body: {
        vendorId: 1,
        code: '1128810',
        supplyId: 10,
        baseQuantity: '36',
        label: 'caixa',
      },
    });
  });
});
