import { render, screen, within } from '@testing-library/react';
import { ItemTree } from './ItemTree';

describe('ItemTree', () => {
  it('mostra o item e, embaixo, o adicional e a observação', () => {
    render(
      <ItemTree
        rows={[
          {
            key: '1',
            quantity: 2,
            name: 'X Salada',
            artisanal: false,
            details: ['com bacon', 'Sem tomate'],
          },
          {
            key: '2',
            quantity: 1,
            name: 'X Burguer',
            artisanal: true,
            details: [],
          },
        ]}
      />,
    );
    const [salada, burguer] = screen
      .getAllByRole('listitem')
      .filter((item) => item.parentElement?.classList.contains('item-tree'));
    expect(salada).toHaveTextContent(/^2× X Salada/);
    expect(
      within(salada)
        .getAllByRole('listitem')
        .map((detail) => detail.textContent),
    ).toEqual(['com bacon', 'Sem tomate']);
    expect(burguer).toHaveTextContent('X Burguer (art.)');
  });

  it('pedido sem itens (importado da planilha) mostra um traço', () => {
    render(<ItemTree rows={[]} />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });
});
