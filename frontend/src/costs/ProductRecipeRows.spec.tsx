import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { CostSupply, RecipeItem } from '../api/cost-types';
import { ProductRecipeRows } from './ProductRecipeRows';

describe('ProductRecipeRows', () => {
  const supplies: CostSupply[] = [
    {
      id: 1,
      name: 'Pão de hambúrguer',
      countUnit: 'un',
      unitCost: '1.4000',
      basePrice: '1.40',
      baseQuantity: '1',
      baseLabel: 'un',
      packages: [],
    },
    {
      id: 2,
      name: 'Hambúrguer 56g',
      countUnit: 'un',
      unitCost: '1.1900',
      basePrice: '1.19',
      baseQuantity: '1',
      baseLabel: 'un',
      packages: [],
    },
  ];

  const components: RecipeItem[] = [
    { supplyId: 1, quantity: '1' },
    { supplyId: 2, quantity: '1' },
  ];

  it('renderiza os componentes com botão + Insumo e texto explicativo', () => {
    render(
      <ProductRecipeRows
        productId={10}
        components={components}
        supplies={supplies}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByText('Pão de hambúrguer')).toBeInTheDocument();
    expect(screen.getByText('Hambúrguer 56g')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: '+ Insumo' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Mudar a quantidade entra no mesmo rascunho dos preços/i,
      ),
    ).toBeInTheDocument();
  });

  it('altera a quantidade de um componente e chama onChange', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <ProductRecipeRows
        productId={10}
        components={components}
        supplies={supplies}
        onChange={onChange}
      />,
    );

    const input = screen.getByLabelText('Quantidade de Pão de hambúrguer');
    await user.clear(input);
    await user.type(input, '2');

    expect(onChange).toHaveBeenCalledWith([
      { supplyId: 1, quantity: '2' },
      { supplyId: 2, quantity: '1' },
    ]);
  });
});
