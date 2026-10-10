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
    expect(within(line).getByText('+ bacon')).toBeInTheDocument();
    expect(within(line).getByText('sem tomate')).toBeInTheDocument();
    // Unitário e total do X Salada; o bacon com o preço dele na linha de baixo.
    expect(within(line).getAllByText('17,80')).toHaveLength(2);
    expect(within(line).getAllByText('6,00')).toHaveLength(2);
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

  // Bug de 2026-10-10: o item repetido somava na linha pura e o "+ovo" pegava as duas.
  it('cada lanche fica com os seus adicionais; só os iguais se juntam ao salvar', async () => {
    const api = await renderCashier(apiWithAddons());
    await typeInItem('9{Enter}+bac{Enter}9{Enter}');
    await userEvent.keyboard('9{Enter}+ovo{Enter}9{Enter}+ovo{Enter}');
    await userEvent.keyboard('{Enter}1{Enter}');
    const [body] = postedBodies(api, '/orders') as [{ items: unknown }];
    expect(body.items).toEqual([
      { productId: 1, quantity: 1, addons: [{ productId: 33, quantity: 1 }] },
      { productId: 1, quantity: 1 },
      { productId: 1, quantity: 2, addons: [{ productId: 34, quantity: 1 }] },
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

describe('CashierPage: painel de adicionais', () => {
  it('o botão da linha abre o painel: põe o bacon e grava a observação', async () => {
    await renderCashier(apiWithAddons());
    await typeInItem('9{Enter}');
    await userEvent.click(
      screen.getByRole('button', {
        name: 'Adicionais e observação de X Salada',
      }),
    );
    const panel = screen.getByRole('dialog', {
      name: 'Adicionais de X Salada',
    });
    await userEvent.click(
      within(panel).getByRole('button', { name: 'Mais Add bacon' }),
    );
    await userEvent.type(
      within(panel).getByLabelText('Observação'),
      'sem tomate',
    );
    await userEvent.click(
      within(panel).getByRole('button', { name: 'Pronto' }),
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    const line = screen.getByRole('list', { name: 'Itens do pedido' });
    expect(within(line).getByText('+ bacon')).toBeInTheDocument();
    expect(within(line).getByText('sem tomate')).toBeInTheDocument();
    expect(screen.getByLabelText('Item')).toHaveFocus();
  });

  it('F4 abre o painel da última linha; Esc fecha e volta ao Item', async () => {
    await renderCashier(apiWithAddons());
    await typeInItem('9{Enter}coca 6{Enter}{F4}');
    const panel = screen.getByRole('dialog', {
      name: 'Adicionais de Coca Cola 600ml',
    });
    // Bebida não aceita adicionais: o painel só tem a observação.
    expect(
      within(panel).getByText('Este item não aceita adicionais.'),
    ).toBeInTheDocument();
    expect(within(panel).getByLabelText('Observação')).toHaveFocus();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Item')).toHaveFocus();
  });
});
