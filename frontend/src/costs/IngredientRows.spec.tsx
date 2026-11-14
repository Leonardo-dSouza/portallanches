import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { CostSupply, RecipeItem } from '../api/cost-types';
import { IngredientRows } from './IngredientRows';

describe('IngredientRows', () => {
  const supplies: CostSupply[] = [
    {
      id: 1,
      name: 'Acém',
      countUnit: 'kg',
      unitCost: '39.9000',
      basePrice: '39.90',
      baseQuantity: '1',
      baseLabel: 'kg',
      packages: [],
    },
    {
      id: 2,
      name: 'Hambúrguer artesanal carne',
      countUnit: 'un',
      unitCost: '5.9900',
      basePrice: null,
      baseQuantity: null,
      baseLabel: null,
      packages: [],
    },
    {
      id: 3,
      name: 'Pão de hambúrguer',
      countUnit: 'un',
      unitCost: '1.4000',
      basePrice: '1.40',
      baseQuantity: '1',
      baseLabel: 'un',
      packages: [],
    },
    {
      id: 4,
      name: 'Queijo prato',
      countUnit: 'kg',
      unitCost: '40.0000',
      basePrice: '40.00',
      baseQuantity: '1',
      baseLabel: 'kg',
      packages: [],
    },
  ];

  const items: RecipeItem[] = [
    { supplyId: 1, quantity: '2' },
    { supplyId: 3, quantity: '1' },
  ];

  it('renderiza os insumos com quantidade, unidade, custo e subtotal', () => {
    render(
      <IngredientRows items={items} supplies={supplies} onChange={vi.fn()} />,
    );

    expect(screen.getByText('Acém')).toBeInTheDocument();
    expect(screen.getByText('Pão de hambúrguer')).toBeInTheDocument();
    expect(screen.getByDisplayValue('2')).toBeInTheDocument();
    expect(screen.getByText('kg')).toBeInTheDocument();
    expect(screen.getByText('39,9000')).toBeInTheDocument();
    expect(screen.getByText('79,80')).toBeInTheDocument();
  });

  it('chama onChange ao alterar a quantidade para um valor válido', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <IngredientRows items={items} supplies={supplies} onChange={onChange} />,
    );

    const input = screen.getByLabelText('Quantidade de Acém');
    await user.clear(input);
    await user.type(input, '1,5');

    expect(onChange).toHaveBeenCalledWith([
      { supplyId: 1, quantity: '1.5' },
      { supplyId: 3, quantity: '1' },
    ]);
  });

  it('quantidade inválida não chama onChange e marca o campo', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <IngredientRows items={items} supplies={supplies} onChange={onChange} />,
    );

    const input = screen.getByLabelText('Quantidade de Acém');
    await user.clear(input);
    await user.type(input, '0');

    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('tira o insumo ao clicar na tecla Tirar', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <IngredientRows items={items} supplies={supplies} onChange={onChange} />,
    );

    const removeBtn = screen.getByLabelText('Tirar Acém');
    await user.click(removeBtn);

    expect(onChange).toHaveBeenCalledWith([{ supplyId: 3, quantity: '1' }]);
  });

  it('a busca não oferece insumos já usados nem os excluídos por prop', async () => {
    const user = userEvent.setup();

    render(
      <IngredientRows
        items={items}
        supplies={supplies}
        excludedSupplyIds={[2]}
        onChange={vi.fn()}
      />,
    );

    const addBtn = screen.getByRole('button', { name: /\+ Ingrediente/i });
    await user.click(addBtn);

    const searchInput = screen.getByPlaceholderText(/buscar insumo/i);
    expect(searchInput).toBeInTheDocument();

    const list = screen.getByRole('list', { name: 'Insumos disponíveis' });
    // Insumos 1 e 3 já estão em items, 2 está em excludedSupplyIds. Só resta o 4 (Queijo prato).
    expect(within(list).queryByText(/Acém/)).not.toBeInTheDocument();
    expect(
      within(list).queryByText(/Hambúrguer artesanal carne/),
    ).not.toBeInTheDocument();
    expect(within(list).getByText(/Queijo prato/)).toBeInTheDocument();
  });

  it('adiciona insumo selecionado na busca chamando onChange', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <IngredientRows
        items={items}
        supplies={supplies}
        addLabel="+ Insumo"
        onChange={onChange}
      />,
    );

    const addBtn = screen.getByRole('button', { name: '+ Insumo' });
    await user.click(addBtn);

    const option = screen.getByText('Queijo prato');
    await user.click(option);

    expect(onChange).toHaveBeenCalledWith([
      { supplyId: 1, quantity: '2' },
      { supplyId: 3, quantity: '1' },
      { supplyId: 4, quantity: '1' },
    ]);
  });
});
