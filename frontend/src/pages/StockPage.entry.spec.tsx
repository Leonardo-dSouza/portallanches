import { beforeEach, describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { StockEntryRecord } from '../api/types';
import {
  clickStockButton as click,
  fakeApi,
  postedTo,
  renderStock,
  typeStockInput as type,
} from '../test-support/render-stock-page';

const ENTRY: StockEntryRecord = {
  lotId: 7,
  supplyId: 2,
  supplyName: 'Leite condensado',
  countUnit: 'un',
  quantity: '12',
  remaining: '12',
  expiresOn: null,
  unitCost: '5.5',
  createdByName: 'caixa',
  createdAt: '2026-09-25T15:00:00Z',
  reversedAt: null,
  reversible: true,
};

beforeEach(() => {
  localStorage.clear();
});

describe('StockPage: entrada', () => {
  it('lança a compra inteira de uma vez, só com as linhas digitadas', async () => {
    const api = await renderStock();
    await userEvent.click(screen.getByRole('tab', { name: 'Entrada' }));
    await type('Quantidade de iT Laranja 2L', '2');
    await userEvent.selectOptions(
      screen.getByLabelText('Unidade de iT Laranja 2L'),
      'fardo',
    );
    expect(screen.getByText('+ 12 un')).toBeInTheDocument();
    // Validade no calendário do app (2026-10-11): abre em setembro (hoje), vai a outubro.
    await userEvent.click(
      screen.getByRole('button', { name: /^Validade de iT Laranja 2L/ }),
    );
    await click('Próximo mês');
    await click('quinta, 15 de outubro de 2026');
    await type('Valor pago por iT Laranja 2L', '25');
    await userEvent.selectOptions(
      screen.getByLabelText('Valor pago de iT Laranja 2L é'),
      'por fardo',
    );
    await type('Quantidade de Leite condensado', '3');
    await click('Lançar compra (2)');
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Compra lançada: 2 insumos.',
    );
    expect(postedTo(api, '/stock/entries')).toEqual([
      {
        items: [
          {
            supplyId: 1,
            amount: '2',
            packageName: 'fardo',
            expiresOn: '2026-10-15',
            paid: '25.00',
            paidPer: 'unit',
          },
          {
            supplyId: 2,
            amount: '3',
            packageName: null,
            expiresOn: null,
            paid: null,
            paidPer: 'total',
          },
        ],
      },
    ]);
  });

  it('erro na linha mostra o insumo e não chama a API', async () => {
    const api = await renderStock();
    await userEvent.click(screen.getByRole('tab', { name: 'Entrada' }));
    await type('Valor pago por Leite condensado', '10');
    await click('Lançar compra (1)');
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Leite condensado: quantidade inválida',
    );
    expect(postedTo(api, '/stock/entries')).toEqual([]);
  });

  it('desfaz uma entrada do histórico em dois cliques', async () => {
    const api = fakeApi();
    api.stockEntries = [ENTRY];
    await renderStock(api);
    await userEvent.click(screen.getByRole('tab', { name: 'Entrada' }));
    await screen.findByRole('button', {
      name: 'Desfazer entrada de Leite condensado',
    });
    await click('Desfazer entrada de Leite condensado');
    expect(postedTo(api, '/stock/entries/7/reversal')).toEqual([]);
    await click('Confirmar: desfazer entrada de Leite condensado');
    expect(await screen.findByText('Desfeita')).toBeInTheDocument();
    expect(postedTo(api, '/stock/entries/7/reversal')).toHaveLength(1);
  });

  // Regressão de 2026-10-25: o caixa via o custo pago de cada entrada.
  it('o caixa vê o histórico sem a coluna do custo pago', async () => {
    const api = fakeApi();
    api.stockEntries = [ENTRY];
    await renderStock(api);
    await userEvent.click(screen.getByRole('tab', { name: 'Entrada' }));
    await screen.findByRole('button', {
      name: 'Desfazer entrada de Leite condensado',
    });
    expect(
      screen.queryByRole('columnheader', { name: 'Custo pago' }),
    ).toBeNull();
    expect(screen.queryByText('R$ 5,50 / un')).toBeNull();
  });

  it('o admin vê o custo pago de cada entrada', async () => {
    const api = fakeApi();
    api.role = 'ADMIN';
    api.stockEntries = [ENTRY];
    await renderStock(api);
    await userEvent.click(screen.getByRole('tab', { name: 'Entrada' }));
    expect(
      await screen.findByRole('columnheader', { name: 'Custo pago' }),
    ).toBeInTheDocument();
    expect(screen.getByText('R$ 5,50 / un')).toBeInTheDocument();
  });
});
