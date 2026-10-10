import { fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { apiWithAddons } from '../test-support/addon-menu';
import {
  addOrderByKeyboard,
  renderCashier,
} from '../test-support/render-cashier';

/** Linha da lista de pedidos (a 2ª da tabela; a 1ª é o cabeçalho). */
const firstOrderRow = () => screen.getAllByRole('row')[1];

describe('CashierPage: pop-up do pedido (pedido de 2026-10-10)', () => {
  it('clicar na linha abre os itens com unitário e total; Esc fecha', async () => {
    await renderCashier(apiWithAddons());
    await addOrderByKeyboard('9{Enter}+bac{Enter}');
    await userEvent.click(await screen.findByText('1× X Salada'));
    const dialog = screen.getByRole('dialog', { name: '#1 Balcão' });
    const table = within(dialog).getByRole('table');
    expect(within(table).getByText('+ bacon')).toBeInTheDocument();
    expect(within(table).getAllByText('17,80')).toHaveLength(2);
    expect(within(dialog).getByText('R$ 23,80')).toBeInTheDocument();
    fireEvent(dialog, new Event('cancel'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('o botão "Ver pedido" abre pelo teclado; Editar leva o pedido para a comanda', async () => {
    await renderCashier();
    await addOrderByKeyboard();
    await screen.findByText('1× X Salada');
    await userEvent.click(
      within(firstOrderRow()).getByRole('button', { name: 'Ver pedido' }),
    );
    const dialog = screen.getByRole('dialog', { name: '#1 Balcão' });
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Editar pedido' }),
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /^Editar pedido/ }),
    ).toBeInTheDocument();
  });

  it('os botões da linha não abrem o pop-up', async () => {
    await renderCashier();
    await addOrderByKeyboard();
    await screen.findByText('1× X Salada');
    await userEvent.click(
      within(firstOrderRow()).getByRole('button', { name: 'Editar' }),
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
