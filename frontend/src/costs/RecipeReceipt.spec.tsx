import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { costTabSheet } from '../test-support/cost-tab-fixture';
import { RecipeReceipt } from './RecipeReceipt';

const supplies = costTabSheet().snapshot.supplies;
const burger = [
  { supplyId: 2, quantity: '1' },
  { supplyId: 1, quantity: '0.072' },
  { supplyId: 3, quantity: '1' },
];

function renderReceipt(onChange = vi.fn()) {
  render(
    <RecipeReceipt
      productName="X Burguer"
      items={burger}
      supplies={supplies}
      cmv="8.48"
      onChange={onChange}
    />,
  );
  return onChange;
}

describe('RecipeReceipt', () => {
  it('lista o que mais pesa primeiro, com o custo de cada insumo e a soma', () => {
    renderReceipt();

    const receipt = screen.getByRole('region', {
      name: 'Receita do X Burguer',
    });
    const names = within(receipt)
      .getAllByRole('listitem')
      .map((li) => li.querySelector('.receipt-name')?.textContent);
    expect(names).toEqual([
      'Queijo peça',
      'Pão de hambúrguer',
      'Hambúrguer 56g',
    ]);
    expect(within(receipt).getByText('R$ 2,87')).toBeVisible();
    expect(within(receipt).getByText('R$ 8,48')).toBeVisible();
  });

  it('mudar a quantidade e tirar um insumo vão para o rascunho', async () => {
    const onChange = renderReceipt();

    const cheese = screen.getByLabelText('Quantidade de Queijo peça');
    await userEvent.clear(cheese);
    await userEvent.type(cheese, '0,08');
    expect(onChange).toHaveBeenLastCalledWith([
      { supplyId: 2, quantity: '1' },
      { supplyId: 1, quantity: '0.08' },
      { supplyId: 3, quantity: '1' },
    ]);

    await userEvent.click(
      screen.getByRole('button', { name: 'Tirar Hambúrguer 56g' }),
    );
    expect(onChange).toHaveBeenLastCalledWith([
      { supplyId: 2, quantity: '1' },
      { supplyId: 1, quantity: '0.072' },
    ]);
  });

  it('+ Insumo busca e acrescenta', async () => {
    const onChange = renderReceipt();

    await userEvent.click(screen.getByRole('button', { name: '+ Insumo' }));
    await userEvent.click(screen.getByRole('button', { name: /Salsicha/ }));

    expect(onChange).toHaveBeenLastCalledWith([
      ...burger,
      { supplyId: 4, quantity: '1' },
    ]);
  });
});
