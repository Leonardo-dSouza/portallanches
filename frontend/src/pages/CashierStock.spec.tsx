import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FakeApiClient } from '../test-support/fake-api-client';
import { renderCashier } from '../test-support/render-cashier';

/** Cardápio de hoje com o saldo baixo das bebidas (abaixo do aviso). */
const MENU_WITH_STOCK = [
  {
    id: 5,
    name: 'Coca Cola 600ml',
    menuNumber: null,
    categoryId: 4,
    categoryName: 'Refrigerantes',
    addonCategoryId: null,
    salePrice: '7.00',
    stockLeft: 2,
  },
  {
    id: 6,
    name: 'Coca Cola 2l',
    menuNumber: null,
    categoryId: 4,
    categoryName: 'Refrigerantes',
    addonCategoryId: null,
    salePrice: '12.00',
    stockLeft: 0,
  },
];

function apiWithLowStock(): FakeApiClient {
  const api = new FakeApiClient();
  api.saleMenus.hoje = MENU_WITH_STOCK;
  return api;
}

describe('CashierPage: saldo das bebidas', () => {
  it('a busca mostra quanto resta e "sem estoque"', async () => {
    await renderCashier(apiWithLowStock());
    await userEvent.click(screen.getByLabelText('Item'));
    await userEvent.keyboard('coca');
    expect(await screen.findByText('restam 2')).toBeInTheDocument();
    expect(screen.getByText('sem estoque')).toBeInTheDocument();
  });

  it('vender além do saldo salva e avisa para conferir', async () => {
    const api = apiWithLowStock();
    api.stockShortfalls = [
      { supplyId: 30, supplyName: 'Coca Cola 2l', missing: '1' },
    ];
    await renderCashier(api);
    await userEvent.click(screen.getByLabelText('Item'));
    await userEvent.keyboard('coca 2{Enter}{Enter}{Enter}1{Enter}');
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Vendido além do estoque do sistema: Coca Cola 2l (faltou 1)',
    );
    expect(
      api.calls.filter((c) => c.method === 'POST' && c.path === '/orders'),
    ).toHaveLength(1);
  });
});
