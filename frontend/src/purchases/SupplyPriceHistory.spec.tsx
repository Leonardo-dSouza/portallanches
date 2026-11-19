import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ApiContext } from '../api/api-context';
import type { SupplyPriceRecord } from '../api/purchase-types';
import { FakeApiClient } from '../test-support/fake-api-client';
import {
  SupplyPriceHistory,
  SupplyPriceHistoryDialog,
} from './SupplyPriceHistory';

const SAMPLE_PRICES: SupplyPriceRecord[] = [
  {
    invoiceId: 101,
    issuedAt: '2026-10-30T14:20:00.000Z',
    vendorName: 'Faroeste',
    productName: 'HB ARTESANAL 56G CX 36',
    description: 'HB ARTESANAL 56G CX 36',
    quantity: '2',
    unit: 'CX',
    unitPrice: '45.79',
    label: 'caixa',
    baseQuantity: '36',
    paidPerUnit: '1.2719',
    basePerUnit: '1.2444',
    diffPercent: '2.2',
    above: true,
  },
  {
    invoiceId: 90,
    issuedAt: '2026-10-15T10:00:00.000Z',
    vendorName: 'Atacadão',
    productName: 'HB ARTESANAL 56G CX 36',
    description: 'HB ARTESANAL 56G CX 36',
    quantity: '1',
    unit: 'CX',
    unitPrice: '43.90',
    label: 'caixa',
    baseQuantity: '36',
    paidPerUnit: '1.2194',
    basePerUnit: '1.2444',
    diffPercent: '-2.0',
    above: false,
  },
];

describe('SupplyPriceHistory', () => {
  it('mostra mensagem quando não há nenhuma compra ligada ao insumo', async () => {
    const api = new FakeApiClient();
    api.purchases.supplyPrices[10] = [];

    render(
      <ApiContext.Provider value={api}>
        <SupplyPriceHistory supplyId={10} />
      </ApiContext.Provider>,
    );

    expect(
      await screen.findByText(
        'Nenhuma compra ligada a este insumo ainda. Ligue os itens das notas em Compras → Notas.',
      ),
    ).toBeInTheDocument();
  });

  it('lista as compras com data, mercado, descrição, quantidade, pago na embalagem, pago/un, base/un e diferença %', async () => {
    const api = new FakeApiClient();
    api.purchases.supplyPrices[10] = SAMPLE_PRICES;

    render(
      <ApiContext.Provider value={api}>
        <SupplyPriceHistory supplyId={10} />
      </ApiContext.Provider>,
    );

    expect(await screen.findByText('Faroeste')).toBeInTheDocument();
    expect(screen.getAllByText('HB ARTESANAL 56G CX 36')).toHaveLength(2);
    expect(screen.getByText('2 CX')).toBeInTheDocument();
    expect(screen.getByText('45,79')).toBeInTheDocument();
    expect(screen.getByText('1,2719')).toBeInTheDocument();
    expect(screen.getAllByText('1,2444')).toHaveLength(2);

    const diffAbove = screen.getByText('+2,2%');
    expect(diffAbove).toHaveClass('text-danger');

    const diffBelow = screen.getByText('-2,0%');
    expect(diffBelow).toHaveClass('text-success');
  });

  it('SupplyPriceHistoryDialog exibe o histórico dentro de um diálogo modal', async () => {
    const api = new FakeApiClient();
    api.purchases.supplyPrices[10] = SAMPLE_PRICES;

    render(
      <ApiContext.Provider value={api}>
        <SupplyPriceHistoryDialog
          supply={{ id: 10, name: 'Hambúrguer 56g' }}
          onClose={() => {}}
        />
      </ApiContext.Provider>,
    );

    const dialog = await screen.findByRole('dialog', {
      name: 'Histórico: Hambúrguer 56g',
    });
    expect(within(dialog).getByText('Faroeste')).toBeInTheDocument();
  });
});
