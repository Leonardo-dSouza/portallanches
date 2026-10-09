import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FakeApiClient } from '../test-support/fake-api-client';
import { pickCashDate, renderCashier } from '../test-support/render-cashier';

const SUNDAY_20 = 'domingo, 20 de setembro de 2026';

/** Cardápio de 20/09, antes do reajuste: X Salada mais barato e o X Frango, que saiu depois. */
const MENU_ON_20 = [
  {
    id: 1,
    name: 'X Salada',
    menuNumber: 9,
    categoryName: 'Tradicional',
    salePrice: '15.00',
  },
  {
    id: 30,
    name: 'X Frango',
    menuNumber: 30,
    categoryName: 'Tradicional',
    salePrice: '16.00',
  },
];

describe('CashierPage: cardápio do dia escolhido', () => {
  it('caixa atrasado lança com o preço daquele dia e o item que saiu depois', async () => {
    const api = new FakeApiClient();
    api.saleMenus['2026-09-20'] = MENU_ON_20;
    await renderCashier(api);
    await pickCashDate(SUNDAY_20);
    await screen.findByRole('heading', {
      name: 'Caixa de 20/09/2026 - Domingo',
    });
    expect(api.lines).toContain('GET /products/for-sale?date=2026-09-20');
    await userEvent.click(screen.getByLabelText('Item'));
    await userEvent.keyboard('9{Enter}30{Enter}');
    // 15,00 + 16,00 do cardápio de 20/09, não os 17,80 de hoje.
    expect(await screen.findByText('R$ 31,00')).toBeInTheDocument();
  });

  it('o caixa de hoje pede o cardápio sem data (o dia do servidor)', async () => {
    const api = await renderCashier();
    expect(api.lines).toContain('GET /products/for-sale');
  });
});
