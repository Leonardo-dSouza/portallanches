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
    expect(within(firstOrderRow()).getByText('VIAGEM')).toHaveAttribute(
      'data-dining',
      'TAKEAWAY',
    );
    expect(within(dialog).getByText('VIAGEM')).toHaveAttribute(
      'data-dining',
      'TAKEAWAY',
    );
    fireEvent(dialog, new Event('cancel'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('o número do pedido é o botão que abre pelo teclado; Editar leva o pedido para a comanda', async () => {
    await renderCashier();
    await addOrderByKeyboard();
    await screen.findByText('1× X Salada');
    await userEvent.click(
      within(firstOrderRow()).getByRole('button', { name: 'Ver pedido #1' }),
    );
    const dialog = screen.getByRole('dialog', { name: '#1 Balcão' });
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Editar pedido' }),
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /^Editando #1/ }),
    ).toBeInTheDocument();
  });

  it('Adicionar item e Editar vêm escritos na linha; Reimprimir e Cancelar só com ícone (2026-11-11)', async () => {
    await renderCashier();
    await addOrderByKeyboard();
    await screen.findByText('1× X Salada');
    const row = within(firstOrderRow());
    expect(
      row.getByRole('button', { name: 'Adicionar item' }),
    ).toHaveTextContent('Adicionar item');
    expect(row.getByRole('button', { name: 'Editar' })).toHaveTextContent(
      'Editar',
    );
    expect(row.getByRole('button', { name: 'Reimprimir' }).textContent).toBe(
      '',
    );
    expect(
      row.getByRole('button', { name: 'Cancelar pedido' }).textContent,
    ).toBe('');
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

  it('mostra etiqueta COMER na linha e no pop-up quando para comer no local', async () => {
    await renderCashier();
    await userEvent.click(screen.getByLabelText('COMER'));
    await addOrderByKeyboard('9{Enter}');
    await screen.findByText('1× X Salada');
    expect(within(firstOrderRow()).getByText('Balcão')).toBeInTheDocument();
    expect(within(firstOrderRow()).getByText('COMER')).toHaveAttribute(
      'data-dining',
      'EAT_IN',
    );
    await userEvent.click(screen.getByText('1× X Salada'));
    const dialog = screen.getByRole('dialog', { name: '#1 Balcão' });
    expect(within(dialog).getByText('COMER')).toHaveAttribute(
      'data-dining',
      'EAT_IN',
    );
  });
});
