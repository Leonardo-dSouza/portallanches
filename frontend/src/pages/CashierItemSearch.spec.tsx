import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderCashier } from '../test-support/render-cashier';

const chipOf = (option: HTMLElement) =>
  option.querySelector('.menu-number-chip');

describe('CashierPage: lista da busca do item (2026-10-15)', () => {
  it('o artesanal leva a marca própria no número e na categoria; o tradicional não', async () => {
    await renderCashier();
    await waitFor(() => expect(screen.getByLabelText('Qtd')).toHaveFocus());
    await userEvent.keyboard('x salada');
    const list = screen.getByRole('listbox', { name: 'Itens encontrados' });
    const [traditional, artisanal] = within(list)
      .getAllByRole('option')
      .filter((option) => option.textContent?.includes('X Salada'));
    expect(traditional).toHaveTextContent('Tradicional');
    expect(chipOf(traditional)).not.toHaveAttribute('data-artisanal');
    expect(artisanal).toHaveTextContent('Artesanal');
    expect(chipOf(artisanal)).toHaveAttribute('data-artisanal', 'true');
    expect(within(artisanal).getByText('Artesanal')).toHaveAttribute(
      'data-artisanal',
      'true',
    );
  });

  it('a seta desce pela lista inteira e o Enter põe o marcado', async () => {
    await renderCashier();
    await waitFor(() => expect(screen.getByLabelText('Qtd')).toHaveFocus());
    await userEvent.keyboard('x salada');
    const list = screen.getByRole('listbox', { name: 'Itens encontrados' });
    const options = within(list).getAllByRole('option');
    await userEvent.keyboard('{ArrowDown}');
    expect(options[1]).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByLabelText('Item')).toHaveAttribute(
      'aria-activedescendant',
      options[1].id,
    );
  });
});
