import { beforeEach, describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  fakeApi,
  NO_FLAGS,
  renderStock,
  stockItem,
} from '../test-support/render-stock-page';

beforeEach(() => {
  localStorage.clear();
});

describe('StockPage: situação', () => {
  it('mostra saldo e alertas; filtro deixa só quem precisa de atenção', async () => {
    await renderStock();
    expect(
      screen.getByText('2 de 3 insumos precisam de atenção.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Vence amanhã')).toBeInTheDocument();
    expect(screen.getByText('Abaixo do mínimo (4 un)')).toBeInTheDocument();
    await userEvent.click(
      screen.getByLabelText('Só os que precisam de atenção'),
    );
    const rows = within(screen.getByRole('table')).getAllByRole('row');
    // Cabeçalho + título "Sem seção" + os 2 que precisam de atenção.
    expect(rows).toHaveLength(4);
    expect(screen.queryByText('Calabresa fatiada')).not.toBeInTheDocument();
  });

  it('diário sem contagem hoje aparece com "Contar hoje"', async () => {
    const api = fakeApi();
    api.stockItems[2] = stockItem(3, 'Calabresa fatiada', {
      dailyCount: true,
      flags: { ...NO_FLAGS, countDue: true },
    });
    await renderStock(api);
    expect(screen.getByText('Contar hoje')).toBeInTheDocument();
    expect(
      screen.getByText('3 de 3 insumos precisam de atenção.'),
    ).toBeInTheDocument();
  });

  it('sem alerta, a linha fica sem selo (o "Em dia" de 0 e nunca contado confundia)', async () => {
    await renderStock(fakeApi());
    expect(screen.queryByText('Em dia')).toBeNull();
  });

  it('ao clicar na linha de um insumo abre suas movimentações e permite filtrar', async () => {
    const api = fakeApi();
    api.stockMovementsReports.set(1, {
      supply: { id: 1, name: 'iT Laranja 2L', countUnit: 'un' },
      totals: { entered: '12', sold: '2', adjusted: '0' },
      movements: [
        {
          id: 1,
          kind: 'ENTRY',
          kindLabel: 'Entrada',
          quantity: '12',
          balanceAfter: '12',
          origin: null,
          createdByName: 'Admin',
          createdAt: '2026-09-20T10:00:00.000Z',
        },
        {
          id: 2,
          kind: 'SALE',
          kindLabel: 'Venda',
          quantity: '-2',
          balanceAfter: '10',
          origin: 'Pedido #5 de 25/09',
          createdByName: 'Caixa',
          createdAt: '2026-09-25T20:00:00.000Z',
        },
      ],
    });

    await renderStock(api);
    await userEvent.click(screen.getByText('iT Laranja 2L'));

    const dialog = await screen.findByRole('dialog', {
      name: 'Movimentações: iT Laranja 2L',
    });
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByText('Pedido #5 de 25/09')).toBeInTheDocument();

    const select = within(dialog).getByLabelText('Tipo');
    await userEvent.selectOptions(select, 'SALE');

    expect(within(dialog).getByText('Pedido #5 de 25/09')).toBeInTheDocument();
    const table = within(dialog).getByRole('table');
    expect(within(table).queryByText('Entrada')).toBeNull();
  });
});
