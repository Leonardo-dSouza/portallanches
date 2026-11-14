import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { CostSheetView, PricingCategory } from '../api/cost-types';
import { CategoryCostTab } from './CategoryCostTab';

describe('CategoryCostTab', () => {
  const categoryWithPercentages: PricingCategory = {
    id: 1,
    name: 'Lanches',
    sortOrder: 1,
    fixedCostPercent: '36.00',
    profitPercent: '22.00',
  };

  const categoryWithoutPercentages: PricingCategory = {
    id: 2,
    name: 'Bebidas',
    sortOrder: 2,
    fixedCostPercent: null,
    profitPercent: null,
  };

  const supplies = [
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

  const view: CostSheetView = {
    snapshot: {
      supplies,
      recipes: [],
      products: [
        {
          id: 10,
          name: 'X Salada',
          categoryId: 1,
          menuNumber: 1,
          salePrice: '20.00',
          components: [{ supplyId: 1, quantity: '1' }],
          bundleItems: [],
        },
        {
          id: 11,
          name: 'Combo Família',
          categoryId: 1,
          menuNumber: 2,
          salePrice: '50.00',
          components: [],
          bundleItems: [{ productId: 10, quantity: 2 }],
        },
        {
          id: 20,
          name: 'Coca Cola 2L',
          categoryId: 2,
          menuNumber: 1,
          salePrice: '15.00',
          components: [],
          bundleItems: [],
        },
        {
          id: 21,
          name: 'Água sem custo',
          categoryId: 2,
          menuNumber: 2,
          salePrice: '4.00',
          components: [],
          bundleItems: [],
        },
      ],
      categories: [categoryWithPercentages, categoryWithoutPercentages],
      ifood: { profitPercent: '22.00', commissionPercent: '12.00' },
      lastChangeSetId: 1,
    },
    products: [
      {
        id: 10,
        name: 'X Salada',
        categoryId: 1,
        menuNumber: 1,
        salePrice: '20.00',
        cmv: '7.50',
        cmvComplete: true,
        cmvPercent: '37.5',
        pv: '22.50',
        ifoodPv: '26.00',
        profit: '5.30',
        marginPercent: '26.5',
        belowTarget: false,
      },
      {
        id: 11,
        name: 'Combo Família',
        categoryId: 1,
        menuNumber: 2,
        salePrice: '50.00',
        cmv: '15.00',
        cmvComplete: true,
        cmvPercent: '30.0',
        pv: '45.00',
        ifoodPv: '52.00',
        profit: '17.00',
        marginPercent: '34.0',
        belowTarget: false,
      },
      {
        id: 20,
        name: 'Coca Cola 2L',
        categoryId: 2,
        menuNumber: 1,
        salePrice: '15.00',
        cmv: '9.76',
        cmvComplete: true,
        cmvPercent: '65.1',
        pv: null,
        ifoodPv: null,
        profit: '5.24',
        marginPercent: null,
        belowTarget: false,
      },
      {
        id: 21,
        name: 'Água sem custo',
        categoryId: 2,
        menuNumber: 2,
        salePrice: '4.00',
        cmv: '0.00',
        cmvComplete: false,
        cmvPercent: null,
        pv: null,
        ifoodPv: null,
        profit: null,
        marginPercent: null,
        belowTarget: false,
      },
    ],
    incompleteSupplyIds: [],
  };

  const createMockDraft = () => ({
    sheet: view,
    changes: {
      basePrices: [],
      recipes: [],
      removedRecipeSupplyIds: [],
      components: [],
      salePrices: [],
    },
    preview: null,
    changeCount: 0,
    setBasePrice: vi.fn(),
    setRecipe: vi.fn(),
    removeRecipe: vi.fn(),
    setComponents: vi.fn(),
    setSalePrice: vi.fn(),
    discard: vi.fn(),
    save: vi.fn(),
    saving: false,
    conflict: false,
    error: null,
    reload: vi.fn(),
  });

  it('"Usar PV" chama setSalePrice com o PV', async () => {
    const user = userEvent.setup();
    const draft = createMockDraft();

    render(
      <CategoryCostTab
        category={categoryWithPercentages}
        view={view}
        draft={draft}
      />,
    );

    const usarPvBtn = screen.getByRole('button', { name: 'Usar PV' });
    await user.click(usarPvBtn);

    expect(draft.setSalePrice).toHaveBeenCalledWith({
      productId: 10,
      salePrice: '22.50',
    });
  });

  it('categoria sem percentuais não mostra PV nem faixa de parâmetros com percentuais', () => {
    const draft = createMockDraft();

    render(
      <CategoryCostTab
        category={categoryWithoutPercentages}
        view={view}
        draft={draft}
      />,
    );

    expect(
      screen.getByText(
        'Sem meta de lucro nesta categoria: mostra o lucro bruto (preço − custo).',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Custo fixo/)).not.toBeInTheDocument();
    expect(
      screen.queryByRole('columnheader', { name: /^PV$/ }),
    ).not.toBeInTheDocument();
    expect(screen.getByText('sem custo')).toBeInTheDocument();
  });

  it('receita aberta edita a quantidade e chama setComponents', async () => {
    const user = userEvent.setup();
    const draft = createMockDraft();

    render(
      <CategoryCostTab
        category={categoryWithPercentages}
        view={view}
        draft={draft}
      />,
    );

    const receitaBtn = screen.getByRole('button', { name: 'Receita' });
    await user.click(receitaBtn);

    const input = screen.getByLabelText('Quantidade de Pão de hambúrguer');
    await user.clear(input);
    await user.type(input, '2');

    expect(draft.setComponents).toHaveBeenCalledWith({
      productId: 10,
      components: [{ supplyId: 1, quantity: '2' }],
    });
  });

  it('combo sem receita nem "Usar PV", mostrando tag combo', () => {
    const draft = createMockDraft();

    render(
      <CategoryCostTab
        category={categoryWithPercentages}
        view={view}
        draft={draft}
      />,
    );

    const comboRow = screen.getByText('Combo Família').closest('tr');
    expect(comboRow).not.toBeNull();
    expect(within(comboRow!).getByText('combo')).toBeInTheDocument();
    expect(
      within(comboRow!).queryByRole('button', { name: 'Receita' }),
    ).not.toBeInTheDocument();
    expect(
      within(comboRow!).queryByRole('button', { name: 'Usar PV' }),
    ).not.toBeInTheDocument();
  });
});
