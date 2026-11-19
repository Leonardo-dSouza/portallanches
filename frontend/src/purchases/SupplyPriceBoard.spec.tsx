import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { ApiContext } from '../api/api-context';
import { FakeApiClient } from '../test-support/fake-api-client';
import { BACON_BOARD } from '../test-support/price-board-fixture';
import { SupplyPriceBoard } from './SupplyPriceBoard';

const RANGE = { from: '2025-11-19', to: '2026-11-18' };

function renderBoard(api = new FakeApiClient()) {
  render(
    <ApiContext.Provider value={api}>
      <SupplyPriceBoard range={RANGE} />
    </ApiContext.Provider>,
  );
  return api;
}

function apiWithBacon() {
  const api = new FakeApiClient();
  api.purchases.priceBoard = [BACON_BOARD];
  api.purchases.supplyPrices[10] = [
    {
      invoiceId: 11,
      issuedAt: '2026-11-11T12:00:00.000Z',
      vendorName: 'Assaí',
      productName: 'Bacon Seara kg',
      description: 'BACON SEARA PD kg',
      quantity: '2',
      unit: 'Kg',
      unitPrice: '36.90',
      label: null,
      baseQuantity: '1',
      paidPerUnit: '36.9',
      basePerUnit: null,
      diffPercent: null,
      above: false,
    },
    {
      invoiceId: 8,
      issuedAt: '2026-11-05T12:00:00.000Z',
      vendorName: 'Frios & Cia',
      productName: 'Bacon Aurora manta kg',
      description: 'BACON MANTA AURORA KG',
      quantity: '1',
      unit: 'KG',
      unitPrice: '41.90',
      label: null,
      baseQuantity: '1',
      paidPerUnit: '41.9',
      basePerUnit: null,
      diffPercent: null,
      above: false,
    },
  ];
  return api;
}

const baconRow = () => screen.findByRole('button', { name: /^Bacon/ });

describe('SupplyPriceBoard', () => {
  it('cada insumo diz quanto pagou por último, onde foi mais barato e quanto gastou', async () => {
    renderBoard(apiWithBacon());

    const row = await baconRow();
    // Pagou por último e mais barato no mesmo preço (Seara no Assaí).
    expect(within(row).getAllByText('R$ 36,90/kg')).toHaveLength(2);
    expect(within(row).getByText('Assaí, 11/11/2026')).toBeVisible();
    expect(within(row).getByText('Bacon Seara kg no Assaí')).toBeVisible();
    expect(within(row).getByText('R$ 230,70')).toBeVisible();
    expect(within(row).getByText('4 compras')).toBeVisible();
  });

  it('abrir o insumo mostra as marcas com o último preço de cada mercado', async () => {
    renderBoard(apiWithBacon());

    await userEvent.click(await baconRow());

    const seara = screen.getByRole('region', { name: 'Bacon Seara kg' });
    const markets = within(seara).getAllByRole('listitem');
    expect(markets[0]).toHaveTextContent('Assaí');
    expect(markets[0]).toHaveTextContent('mais barato');
    expect(markets[1]).toHaveTextContent('Spani');
    expect(markets[1]).toHaveTextContent('R$ 38,50/kg');
    const aurora = screen.getByRole('region', {
      name: 'Bacon Aurora manta kg',
    });
    expect(aurora).toHaveTextContent('Frios & Cia');
    // Um mercado só: sem com quem comparar, sem o selo.
    expect(aurora).not.toHaveTextContent('mais barato');
  });

  it('o histórico mostra o produto de cada compra e filtra por produto', async () => {
    const user = userEvent.setup();
    renderBoard(apiWithBacon());

    await user.click(await baconRow());
    await user.click(
      screen.getByRole('button', { name: 'Ver o histórico do Bacon' }),
    );

    const dialog = await screen.findByRole('dialog', {
      name: 'Histórico: Bacon',
    });
    expect(
      within(dialog).getByRole('columnheader', { name: 'Produto' }),
    ).toBeVisible();
    expect(within(dialog).getByText('BACON MANTA AURORA KG')).toBeVisible();
    await user.click(
      within(dialog).getByRole('button', { name: 'Bacon Seara kg' }),
    );
    expect(within(dialog).queryByText('BACON MANTA AURORA KG')).toBeNull();
    expect(within(dialog).getByText('BACON SEARA PD kg')).toBeVisible();
  });

  it('sem compra ligada no período, diz como ligar', async () => {
    renderBoard();
    expect(
      await screen.findByText('Nenhum insumo com compra ligada'),
    ).toBeVisible();
  });
});
