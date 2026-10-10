import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { postedBodies, renderCashier } from '../test-support/render-cashier';

const lineTexts = () =>
  within(screen.getByRole('list', { name: 'Itens do pedido' }))
    .getAllByRole('listitem')
    .map((line) => line.textContent);

describe('CashierPage: campo Qtd antes do Item (pedido de 2026-10-10)', () => {
  it('Qtd → Enter → Item → Enter põe a linha e volta ao Qtd; Enter, Enter vai ao pagamento', async () => {
    const api = await renderCashier();
    await waitFor(() => expect(screen.getByLabelText('Qtd')).toHaveFocus());
    await userEvent.keyboard('2{Enter}');
    expect(screen.getByLabelText('Item')).toHaveFocus();
    await userEvent.keyboard('9{Enter}');
    expect(lineTexts()[0]).toMatch(/^2×9X Salada/);
    expect(screen.getByLabelText('Qtd')).toHaveFocus();
    expect(screen.getByLabelText('Qtd')).toHaveValue('');
    await userEvent.keyboard('{Enter}9{Enter}');
    expect(lineTexts()[1]).toMatch(/^1×9X Salada/);
    await userEvent.keyboard('{Enter}{Enter}1{Enter}');
    expect(postedBodies(api, '/orders')).toEqual([
      {
        items: [{ productId: 1, quantity: 3 }],
        type: 'COUNTER',
        paymentMethodId: 1,
      },
    ]);
  });

  it('letra no Qtd já começa a busca no Item, com a quantidade digitada', async () => {
    await renderCashier();
    await waitFor(() => expect(screen.getByLabelText('Qtd')).toHaveFocus());
    await userEvent.keyboard('3coca 6{Enter}');
    expect(lineTexts()[0]).toMatch(/^3×Coca Cola 600ml/);
  });

  it('"9." no Qtd é o artesanal 9, não uma quantidade', async () => {
    await renderCashier();
    await waitFor(() => expect(screen.getByLabelText('Qtd')).toHaveFocus());
    await userEvent.keyboard('9.');
    expect(screen.getByLabelText('Item')).toHaveValue('9.');
    expect(screen.getByLabelText('Qtd')).toHaveValue('');
    await userEvent.keyboard('{Enter}');
    expect(lineTexts()[0]).toMatch(/^1×9X Salada/);
  });

  it('Enter no Item vazio com o Qtd preenchido volta ao Qtd, sem ir ao pagamento', async () => {
    await renderCashier();
    await waitFor(() => expect(screen.getByLabelText('Qtd')).toHaveFocus());
    await userEvent.keyboard('2{Enter}{Enter}');
    expect(screen.getByLabelText('Qtd')).toHaveFocus();
  });
});
