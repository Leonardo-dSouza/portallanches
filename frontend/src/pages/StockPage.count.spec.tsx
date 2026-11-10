import { beforeEach, describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  clickStockButton as click,
  fakeApi,
  postedTo,
  renderStock,
  stockItem,
  typeStockInput as type,
} from '../test-support/render-stock-page';

beforeEach(() => {
  localStorage.clear();
});

describe('StockPage: contagem', () => {
  it('envia só as linhas preenchidas, com número ou marca', async () => {
    const api = await renderStock();
    await userEvent.click(screen.getByRole('tab', { name: 'Contagem' }));
    await type('Contagem de iT Laranja 2L', '8');
    await click('Precisa comprar: Calabresa fatiada');
    expect(
      screen.getByRole('button', { name: 'Salvar contagem (2)' }),
    ).toBeInTheDocument();
    await click('Salvar contagem (2)');
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Contagem salva: 2 insumos.',
    );
    expect(postedTo(api, '/stock/counts')).toEqual([
      {
        items: [
          { supplyId: 1, status: 'COUNTED', quantity: '8' },
          { supplyId: 3, status: 'NEEDS_PURCHASE' },
        ],
      },
    ]);
  });

  it('"Contagem do dia" mostra só os diários e guarda o que já foi digitado', async () => {
    const api = fakeApi();
    api.stockItems[2] = stockItem(3, 'Calabresa fatiada', { dailyCount: true });
    await renderStock(api);
    await userEvent.click(screen.getByRole('tab', { name: 'Contagem' }));
    await type('Contagem de iT Laranja 2L', '8');
    const daily = screen.getByRole('button', { name: /Contagem do dia/ });
    await userEvent.click(daily);
    expect(daily).toHaveAttribute('aria-pressed', 'true');
    expect(
      screen.getByLabelText('Contagem de Calabresa fatiada'),
    ).toBeVisible();
    expect(
      screen.queryByLabelText('Contagem de iT Laranja 2L'),
    ).not.toBeInTheDocument();
    await userEvent.click(daily);
    expect(screen.getByLabelText('Contagem de iT Laranja 2L')).toHaveValue('8');
  });

  it('sem nada preenchido avisa e não chama a API', async () => {
    const api = await renderStock();
    await userEvent.click(screen.getByRole('tab', { name: 'Contagem' }));
    await click('Salvar contagem');
    expect(await screen.findByRole('status')).toHaveTextContent(
      'pelo menos um insumo',
    );
    expect(postedTo(api, '/stock/counts')).toEqual([]);
  });
});
