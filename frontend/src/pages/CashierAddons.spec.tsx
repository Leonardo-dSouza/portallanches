import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { apiWithAddons } from '../test-support/addon-menu';
import { postedBodies, renderCashier } from '../test-support/render-cashier';

const typeInItem = async (keys: string) => {
  await userEvent.click(screen.getByLabelText('Item'));
  await userEvent.keyboard(keys);
};

describe('CashierPage: adicionais e observação pelo teclado', () => {
  it('"+bac" e "/sem tomate" vão para a última linha e saem no pedido', async () => {
    const api = await renderCashier(apiWithAddons());
    await typeInItem('9{Enter}+bac');
    expect(
      screen.getByRole('listbox', { name: 'Adicionais de X Salada' }),
    ).toBeInTheDocument();
    await userEvent.keyboard('{Enter}/sem tomate{Enter}');
    const line = screen.getByRole('list', { name: 'Itens do pedido' });
    expect(within(line).getByText('com bacon')).toBeInTheDocument();
    expect(within(line).getByText('sem tomate')).toBeInTheDocument();
    // 17,80 + 6,00
    expect(
      screen.getByText('R$ 23,80', { selector: '.order-line-total' }),
    ).toBeInTheDocument();
    await userEvent.keyboard('{Enter}1{Enter}');
    expect(postedBodies(api, '/orders')).toEqual([
      {
        items: [
          {
            productId: 1,
            quantity: 1,
            note: 'sem tomate',
            addons: [{ productId: 33, quantity: 1 }],
          },
        ],
        type: 'COUNTER',
        paymentMethodId: 1,
      },
    ]);
  });

  it('adicional numa bebida avisa e não muda a comanda', async () => {
    await renderCashier(apiWithAddons());
    await typeInItem('coca 6{Enter}+bacon{Enter}');
    expect(await screen.findByRole('alert')).toHaveTextContent(
      '"Coca Cola 600ml" não aceita adicionais',
    );
  });
});
