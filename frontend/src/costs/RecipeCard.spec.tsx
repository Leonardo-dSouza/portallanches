import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { CostSheetView, SupplyRecipe } from '../api/cost-types';
import { RecipeCard } from './RecipeCard';

describe('RecipeCard', () => {
  const initialView: CostSheetView = {
    snapshot: {
      supplies: [
        {
          id: 1,
          name: 'Acém',
          countUnit: 'kg',
          sectionId: null,
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
          sectionId: null,
          unitCost: '6.3500',
          basePrice: null,
          baseQuantity: null,
          baseLabel: null,
          packages: [],
        },
      ],
      recipes: [
        {
          supplyId: 2,
          yieldQuantity: '10',
          items: [{ supplyId: 1, quantity: '1.5' }],
        },
      ],
      products: [
        {
          id: 10,
          name: 'X Salada',
          categoryId: 1,
          menuNumber: 1,
          salePrice: '33.80',
          components: [{ supplyId: 2, quantity: '1' }],
          bundleItems: [],
        },
      ],
      categories: [],
      ifood: { profitPercent: '22.00', commissionPercent: '12.00' },
      lastChangeSetId: 1,
    },
    products: [],
    incompleteSupplyIds: [],
  };

  const initialSheet: CostSheetView = {
    ...initialView,
    snapshot: {
      ...initialView.snapshot,
      supplies: [
        initialView.snapshot.supplies[0],
        { ...initialView.snapshot.supplies[1], unitCost: '5.9900' },
      ],
    },
  };

  const recipe: SupplyRecipe = initialView.snapshot.recipes[0];

  it('renderiza título, quantidade de lanches, rendimento e custo por unidade', () => {
    const mockDraft = {
      setRecipe: vi.fn(),
      removeRecipe: vi.fn(),
    };

    render(
      <RecipeCard
        recipe={recipe}
        view={initialView}
        sheet={initialSheet}
        allRecipes={initialView.snapshot.recipes}
        draft={mockDraft as any}
      />,
    );

    expect(screen.getByText('Hambúrguer artesanal carne')).toBeInTheDocument();
    expect(screen.getByText('1 lanche')).toBeInTheDocument();
    expect(
      screen.getByLabelText(/rendimento de hambúrguer artesanal carne/i),
    ).toHaveValue('10');
    // Antigo riscado e novo atual
    expect(screen.getByText('5,99')).toBeInTheDocument();
    expect(screen.getByText('6,35')).toBeInTheDocument();
  });

  it('mudar rendimento chama setRecipe com a ficha inteira', async () => {
    const user = userEvent.setup();
    const mockDraft = {
      setRecipe: vi.fn(),
      removeRecipe: vi.fn(),
    };

    render(
      <RecipeCard
        recipe={recipe}
        view={initialView}
        sheet={initialSheet}
        allRecipes={initialView.snapshot.recipes}
        draft={mockDraft as any}
      />,
    );

    const yieldInput = screen.getByLabelText(
      /rendimento de hambúrguer artesanal carne/i,
    );
    await user.clear(yieldInput);
    await user.type(yieldInput, '15');

    expect(mockDraft.setRecipe).toHaveBeenCalledWith({
      supplyId: 2,
      yieldQuantity: '15',
      items: [{ supplyId: 1, quantity: '1.5' }],
    });
  });

  it('"Tirar ficha" pede confirmação e chama removeRecipe', async () => {
    const user = userEvent.setup();
    const mockDraft = {
      setRecipe: vi.fn(),
      removeRecipe: vi.fn(),
    };

    render(
      <RecipeCard
        recipe={recipe}
        view={initialView}
        sheet={initialSheet}
        allRecipes={initialView.snapshot.recipes}
        draft={mockDraft as any}
      />,
    );

    const removeBtn = screen.getByRole('button', { name: /tirar ficha/i });
    await user.click(removeBtn);

    // Diálogo de confirmação aberto
    expect(
      screen.getByText(
        /O custo de Hambúrguer artesanal carne fica parado no último valor/i,
      ),
    ).toBeInTheDocument();

    const confirmBtn = screen.getByRole('button', {
      name: 'Confirmar remoção',
    });
    await user.click(confirmBtn);

    expect(mockDraft.removeRecipe).toHaveBeenCalledWith(2);
  });

  it('exibe etiqueta "incompleto" quando o id está em view.incompleteSupplyIds', () => {
    const mockDraft = {
      setRecipe: vi.fn(),
      removeRecipe: vi.fn(),
    };

    const incompleteView: CostSheetView = {
      ...initialView,
      incompleteSupplyIds: [2],
    };

    render(
      <RecipeCard
        recipe={recipe}
        view={incompleteView}
        sheet={initialSheet}
        allRecipes={initialView.snapshot.recipes}
        draft={mockDraft as any}
      />,
    );

    expect(screen.getByText('incompleto')).toBeInTheDocument();
  });
});
