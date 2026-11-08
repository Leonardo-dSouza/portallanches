import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { StockApi } from '../api/stock-api';
import type { StockItem, SupplyMovementsReport } from '../api/types';
import { SupplyMovementsDialog } from './SupplyMovementsDialog';

const item: StockItem = {
  supplyId: 10,
  name: 'Coca Cola 2L',
  sectionId: null,
  countUnit: 'un',
  minStock: '6',
  dailyCount: false,
  quantity: '8',
  lots: [],
  nextExpiry: null,
  lastCount: null,
  oversold: null,
  flags: {
    expired: false,
    expiringSoon: false,
    belowMin: false,
    needsPurchase: false,
    countDue: false,
    oversold: false,
  },
};

const report: SupplyMovementsReport = {
  supply: { id: 10, name: 'Coca Cola 2L', countUnit: 'un' },
  totals: {
    entered: '12',
    sold: '4',
    adjusted: '0',
  },
  movements: [
    {
      id: 2,
      kind: 'SALE',
      kindLabel: 'Venda',
      quantity: '-4',
      balanceAfter: '8',
      origin: 'Pedido #12 de 05/11',
      createdByName: 'Caixa',
      createdAt: '2026-11-05T20:15:00.000Z',
    },
    {
      id: 1,
      kind: 'ENTRY',
      kindLabel: 'Entrada',
      quantity: '12',
      balanceAfter: '12',
      origin: null,
      createdByName: 'Admin',
      createdAt: '2026-11-01T15:00:00.000Z',
    },
  ],
};

class FakeMovementsApi implements Partial<StockApi> {
  lastQuery: { from?: string; to?: string; kind?: string } | undefined;
  async getMovements(
    _supplyId: number,
    query?: { from?: string; to?: string; kind?: string },
  ): Promise<SupplyMovementsReport> {
    this.lastQuery = query;
    if (query?.kind) {
      return {
        ...report,
        movements: report.movements.filter((m) => m.kind === query.kind),
      };
    }
    return report;
  }
}

describe('SupplyMovementsDialog', () => {
  it('exibe totalizadores do período e lista as movimentações do insumo', async () => {
    const api = new FakeMovementsApi();
    render(
      <SupplyMovementsDialog
        supply={item}
        stock={api as unknown as StockApi}
        today="2026-11-08"
        onClose={() => {}}
      />,
    );

    const dialog = await screen.findByRole('dialog', {
      name: 'Movimentações: Coca Cola 2L',
    });
    expect(dialog).toBeInTheDocument();

    // Somas do período:
    const summary = dialog.querySelector('.movements-summary') as HTMLElement;
    expect(within(summary).getByText('+12 un')).toBeInTheDocument();
    expect(within(summary).getByText('4 un')).toBeInTheDocument();
    expect(within(summary).getByText('0 un')).toBeInTheDocument();

    // Tabela:
    const table = within(dialog).getByRole('table');
    expect(within(table).getByText('Pedido #12 de 05/11')).toBeInTheDocument();
    expect(within(table).getByText('-4 un')).toBeInTheDocument();
    expect(within(table).getByText('8 un')).toBeInTheDocument();
    expect(within(table).getByText('Caixa')).toBeInTheDocument();
    expect(within(table).getByText('+12 un')).toBeInTheDocument();
    expect(within(table).getByText('Admin')).toBeInTheDocument();
  });

  it('permite filtrar por tipo de movimentação', async () => {
    const api = new FakeMovementsApi();
    render(
      <SupplyMovementsDialog
        supply={item}
        stock={api as unknown as StockApi}
        today="2026-11-08"
        onClose={() => {}}
      />,
    );

    const dialog = await screen.findByRole('dialog', {
      name: 'Movimentações: Coca Cola 2L',
    });
    const table = within(dialog).getByRole('table');
    expect(within(table).getByText('Venda')).toBeInTheDocument();
    expect(within(table).getByText('Entrada')).toBeInTheDocument();

    // Filtra por Entrada:
    const select = within(dialog).getByLabelText('Filtrar por tipo');
    await userEvent.selectOptions(select, 'ENTRY');

    expect(within(table).queryByText('Pedido #12 de 05/11')).toBeNull();
    expect(within(table).getByText('Entrada')).toBeInTheDocument();
  });

  it('exibe mensagem amigável quando não há movimentações no período', async () => {
    const emptyApi = {
      async getMovements(): Promise<SupplyMovementsReport> {
        return {
          supply: { id: 10, name: 'Coca Cola 2L', countUnit: 'un' },
          totals: { entered: '0', sold: '0', adjusted: '0' },
          movements: [],
        };
      },
    };

    render(
      <SupplyMovementsDialog
        supply={item}
        stock={emptyApi as unknown as StockApi}
        today="2026-11-08"
        onClose={() => {}}
      />,
    );

    expect(
      await screen.findByText('Nenhuma movimentação no período selecionado.'),
    ).toBeInTheDocument();
  });
});
