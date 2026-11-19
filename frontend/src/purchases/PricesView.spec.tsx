import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { ApiContext } from '../api/api-context';
import type { Supply } from '../api/types';
import { FakeApiClient } from '../test-support/fake-api-client';
import { PURCHASE_PRODUCTS } from '../test-support/purchase-fixture';
import { PricesView } from './PricesView';

const RANGE = { from: '2026-09-01', to: '2026-09-30' };

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
  {
    id: 20,
    name: 'Queijo Prato',
    countUnit: 'kg',
    minStock: null,
    deductOnSale: true,
    dailyCount: false,
    sectionId: 1,
    active: true,
    packages: [],
    saleProduct: null,
  },
];

function setupApi() {
  const api = new FakeApiClient();
  api.purchases.products = PURCHASE_PRODUCTS;
  api.supplies = SUPPLIES;
  api.purchases.lastPrices = {
    10: {
      issuedAt: '2026-09-22T20:14:11.000Z',
      vendorName: 'Faroeste',
      paidPerUnit: '1.2719',
      diffPercent: '2.2',
      above: true,
    },
  };
  api.purchases.supplyPrices[10] = [
    {
      invoiceId: 101,
      issuedAt: '2026-09-22T20:14:11.000Z',
      vendorName: 'Faroeste',
      productName: 'HB 56G CX 36',
      description: 'HB 56G CX 36',
      quantity: '1',
      unit: 'CX',
      unitPrice: '45.79',
      label: 'caixa',
      baseQuantity: '36',
      paidPerUnit: '1.2719',
      basePerUnit: '1.2444',
      diffPercent: '2.2',
      above: true,
    },
  ];
  return api;
}

describe('PricesView → visão Por insumo', () => {
  it('alterna para a visão Por insumo e lista os insumos com compras ligadas', async () => {
    const user = userEvent.setup();
    const api = setupApi();

    render(
      <ApiContext.Provider value={api}>
        <PricesView range={RANGE} />
      </ApiContext.Provider>,
    );

    // Por padrão abre na visão por produto
    expect(await screen.findByText('BACON EXEMPLO kg')).toBeInTheDocument();

    // Clica na sub-aba Por insumo
    await user.click(screen.getByRole('tab', { name: 'Por insumo' }));

    // Hambúrguer 56g tem compra ligada, Queijo Prato não tem
    expect(await screen.findByText('Hambúrguer 56g')).toBeInTheDocument();
    expect(screen.getByText('Faroeste')).toBeInTheDocument();
    expect(screen.getByText('1,2719')).toBeInTheDocument();
    expect(screen.queryByText('Queijo Prato')).toBeNull();

    // Clicar no insumo abre o histórico
    await user.click(screen.getByText('Hambúrguer 56g'));
    const dialog = await screen.findByRole('dialog', {
      name: 'Histórico: Hambúrguer 56g',
    });
    expect(within(dialog).getByText('HB 56G CX 36')).toBeInTheDocument();
  });
});
