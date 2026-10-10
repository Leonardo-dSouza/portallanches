import { render, screen, within } from '@testing-library/react';
import type { ItemTreeRow } from './item-tree';
import { ItemTree } from './ItemTree';

const ROWS: ItemTreeRow[] = [
  {
    key: '1',
    quantity: 2,
    name: 'X Salada',
    artisanal: false,
    unitPrice: '17.80',
    total: '35.60',
    addons: [
      { key: '1-33', label: '+ bacon', unitPrice: '6.00', total: '12.00' },
    ],
    note: 'Sem tomate',
  },
  {
    key: '2',
    quantity: 1,
    name: 'X Burguer',
    artisanal: true,
    unitPrice: '14.70',
    total: '14.70',
    addons: [],
    note: '',
  },
];

describe('ItemTree', () => {
  it('mostra sempre a quantidade e, embaixo, o adicional e a observação', () => {
    render(<ItemTree rows={ROWS} />);
    const [salada, burguer] = screen
      .getAllByRole('listitem')
      .filter((item) => item.parentElement?.classList.contains('item-tree'));
    expect(salada).toHaveTextContent(/^2× X Salada/);
    expect(
      within(salada)
        .getAllByRole('listitem')
        .map((detail) => detail.textContent),
    ).toEqual(['+ bacon', 'Sem tomate']);
    expect(burguer).toHaveTextContent('1× X Burguer (art.)');
  });

  it('pedido sem itens (importado da planilha) mostra um traço', () => {
    render(<ItemTree rows={[]} />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });
});
